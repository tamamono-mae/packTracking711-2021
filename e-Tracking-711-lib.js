const fetch = require("node-fetch");
const cheerio = require("cheerio");
const formData = require("form-data");
const { htmlToText } = require('html-to-text');
const tesseract = require("node-tesseract-ocr");
const fs = require('fs');
const format = require('date-format');

let errorMessage = {
  "401" : "驗證碼錯誤，請重試！",
  "404" : "查無該取貨/繳費編號資料，請重新輸入。",
  "417" : "發生例外，請聯絡管理員！",
  "503" : "驗證碼辨識錯誤，請重試！",
}

function dumpToFile(path, buffer) {
  fs.open(path, 'w', function(err, fd) {
    if (err) {
        throw 'could not open file: ' + err;
    }

    // write the contents of the buffer, from position 0 to the end, to the file descriptor returned in opening our file
    fs.write(fd, buffer, 0, buffer.length, null, function(err) {
        if (err) throw 'error writing file: ' + err;
        fs.close(fd, function() {
            console.log('wrote the file successfully');
        });
    });
  });
}

function ocrImage(image) {
  return new Promise(function(resolve ,reject) {
    const config = {
      lang: "eng",
      oem: 3,
      psm: 11,
    }
    tesseract.recognize(image, config).then((text) => {
        let vc = Number.parseInt(text, 10).toString();
        if(vc == "NaN") {
          dumpToFile("image/" + String((new Date())*1) + "_of.jpg", image);
          resolve({
            code: 503
          });
        }
        resolve(vc.padStart(4, "0"));
      })
      .catch((error) => {
        reject(error);
        console.log(error.message);
      });
  });
}

function parseCookies(response) {
  const raw = response.headers.raw()['set-cookie'];
  return raw.map((entry) => {
    const parts = entry.split(';');
    const cookiePart = parts[0];
    return cookiePart;
  }).join(';');
}

function mk711Form(data) {
  var urlencoded = new URLSearchParams();
  urlencoded.append("__EVENTTARGET", "submit");
  urlencoded.append("__EVENTARGUMENT", "");
  urlencoded.append("__VIEWSTATE", data.vstate);
  urlencoded.append("__VIEWSTATEGENERATOR", "3E7313DB");
  urlencoded.append("txtProductNum", data.productNum);
  urlencoded.append("tbChkCode", data.verifyCode);
  urlencoded.append("aaa", "");
  urlencoded.append("txtIMGName", "");
  urlencoded.append("txtPage", "1");
  return urlencoded;
}

async function getIntroInfo() {
  let headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Acept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,ja;q=0.2",
    "Content-Type": "text/html; charset=utf-8",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-GPC": "1",
    "Cache-Control": "max-age=0"
  };

  let requestOptions = {
    method: 'GET',
    headers: headers,
    redirect: 'follow'
  };

  let res = await fetch("https://eservice.7-11.com.tw/E-Tracking/search.aspx", requestOptions);
  let cookie = parseCookies(res);
  let $ = cheerio.load(await res.text());
  let vstate = $('#__VIEWSTATE')[0]['attribs']['value'];
  let image = $('#ImgVCode')[0]['attribs']['src'];
  return {cookie ,vstate, image};
}

async function fetchImageCode(info) {
  let headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Acept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,ja;q=0.2",
    "Content-Type": "text/html; charset=utf-8",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-GPC": "1",
    "Cache-Control": "max-age=0",
    "Cookie": info.cookie
  };

  let requestOptions = {
    method: 'GET',
    headers: headers,
    redirect: 'follow'
  };
  let verifyImage = await fetch("https://eservice.7-11.com.tw/E-Tracking/" + info.image, requestOptions)
  .then(res => res.buffer());
  let decode = await ocrImage(verifyImage);
  info['verifyCode'] = decode;
  //For dump verify image
  info['verifyImage'] = verifyImage;
  return info;
}

async function query711(data) {
  let headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Acept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,ja;q=0.2",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://eservice.7-11.com.tw",
    "DNT": "1",
    "Referer": "https://eservice.7-11.com.tw/E-Tracking/search.aspx",
    "Cookie": data.cookie,
    "Upgrade-Insecure-Requests": "1",
    "Sec-GPC": "1"
  };

  let requestOptions = {
    method: 'POST',
    headers: headers,
    body: mk711Form(data)
  };

  let body = await fetch("https://eservice.7-11.com.tw/E-Tracking/search.aspx", requestOptions).then(res => res.text());
  let $ = cheerio.load(body);
  //delete(body);
  let result = $(".result .shipping #timeline_status").html();
  let resultText = await htmlToText(result);
  delete(result);
  let resultArray = resultText.split("\n").filter(Boolean);
  delete(resultText);
  if (resultArray.length == 0) {
    if($("body script")[8]['children'][0]['data'] == "alert('驗證碼錯誤!!');") {
      //return 401;
      dumpToFile("image/" + String((new Date())*1) + "_ve.jpg", data.verifyImage);
      return {
        code: 401
      };
    }

    if($("#lbMsg").text() == "查無該取貨/繳費編號資料，請重新輸入。")
      return {
        code: 404,
        data: errorMessage[404]
      };
    return {
      code: 417,
      data: errorMessage[417]
    };
  };
  for(var i=0;i<resultArray.length;i++) {
    if(i == 0) {
      resultArray[i] = ' ● ' + resultArray[i];
      continue;
    }
    if(i % 2 == 0) {
      resultArray[i] = ' ○ ' + resultArray[i];
      continue;
    }
    if(i != resultArray.length - 1) {
      resultArray[i] = '｜' + resultArray[i];
      continue;
    }
    resultArray[i] = '　' + resultArray[i];
  }
  var outputStr = "";
  for(var i=0;i<resultArray.length;i++) {
    outputStr+= resultArray[i];
    if(i == resultArray.length - 1) continue;
    outputStr+= "\n";
  }
  return {
    code: 200,
    data: outputStr
  };
}

async function query711Package(productNum) {
  let data = await getIntroInfo();
  data = await fetchImageCode(data);
  data['productNum'] = productNum;
  data = await query711(data);
  return data;

}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  query711Package, errorMessage, sleep
};
