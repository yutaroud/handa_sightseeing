const {canHandle, getSlotValueByName } = require('ask-utils');
const AWS = require('aws-sdk');
AWS.config.loadFromPath('./rootkey.json');
AWS.config.update({region: 'ap-northeast-1'});
const s3 = new AWS.S3();
const dstBucket = process.env.S3_BUCKET_NAME;
const Alexa = require('ask-sdk-core');
const HELP_MESSAGE = '半田市の観光スポットの行き方、イベント情報、遊べる場所や家族でいける場所など観光に関する情報を教えます！どこどこに行きたい！のように聞いてください！';
const STOP_MESSAGE = 'またお願いしますね！';

/* csvの読み込み */
const csvSync = require('csv-parse/lib/sync'); // requiring sync module
const file = 'kanko.csv';
const fs = require('fs');
let data = fs.readFileSync(file);
let res = csvSync(data);
/* ここまで */

/* API用のsyncリクエスト */
const request = require('sync-request');

/* エレメントセレクト用のグローバル変数 */
let firstmessage = "該当のスポットが見つけられませんでした。申し訳ありません。";
let secondmessage = "該当のスポットが見つけられませんでした。申し訳ありません。";
let thirdmessage = "該当のスポットが見つけられませんでした。申し訳ありません。";
let firsturl = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/qr/kanko001.png";
let secondurl = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/qr/kanko001.png";
let thirdurl = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/qr/kanko001.png";
let first_description = "1";
let second_description = "2";
let third_description = "3";


let skill;
exports.handler = async function (event, context) {
    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                ElementSelected,
                EventHandler,
                CategoryHandler,
                KankoAreaHandler,
                HelloHandler,
                ChoiceHandler,
                PreviousHandler,
                NextHandler,
                HelpIntentHandler,
                ExitHandler,
                Exit2Handler,
                UnHandler,
                SessionEndedRequestHandler
            )
            .create();
    }
    return skill.invoke(event);
};




const HelloHandler = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'LaunchRequest')
    },
    async handle (handlerInput) {
        const speechText = "こんにちは。行きたい場所や、カップルにオススメの場所、など何でも聞いてください！";
        if (supportsDisplay(handlerInput) ) {
        const title = '半田市観光案内';
        const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance('https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/higanbana.jpg')
            .getImage();
        const textContent = new Alexa.RichTextContentHelper()
            .withPrimaryText('こんなことを聞いてみてください！')
            .withSecondaryText('1.施設の行き方(例:半田運河の行き方) <br/> 2.オススメの観光地(例:遊べるところ！) <br/> 3.イベント情報(例:イベント情報を教えて！')
            .getTextContent();
        const token = 'TOKEN';
            handlerInput.responseBuilder.addRenderTemplateDirective({
                type: 'BodyTemplate1',
                backButton: 'VISIBLE',
                backgroundImage: backgroundImage,
                title: title,
                textContent: textContent,
                token : token,
            });
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }

};

const KankoAreaHandler = {
  canHandle (handlerInput) {
    return canHandle(handlerInput, 'IntentRequest', 'KankoAreaIntent')
  },
    async handle (handlerInput){
        let message = "申し訳ありません。その情報は現在私にはないようです。公式ホームページのQRコードを参照ください。他に聞きたいことがあれば、もう一度。なければストップと言ってください";
        let log_message = "";
        let image  = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/qr/kanko001.png";
        const area = getSlotValueByName(handlerInput, 'area');
        let content = "";
        if(!area){
            console.log("エリアスロット無し。");
            return handlerInput.responseBuilder
                .speak(message)
                .getResponse();
        }else if(area !== null){
            for(let a=1;a<res.length;a++) {
                if(res[a][3] === area || res[a][3].indexOf(area) > -1){
                    const xzahyou = res[a][9];
                    const yzahyou = res[a][8];
                    const moyori = request('GET', 'http://express.heartrails.com/api/json?method=getStations&x='+xzahyou+'&y='+yzahyou);
                    const moyoriarray = [JSON.parse(moyori.getBody('utf8'))["response"]["station"][0]];
                    const moyoridistance = moyoriarray[0]["distance"];
                    const moyorim = moyoridistance.split("m");
                    const moyoriminutes = moyorim[0]/60;
                    message = res[a][3] + "は"+ moyoriarray[0]["line"] + moyoriarray[0]["name"] + "駅から" + moyoriarray[0]["distance"] + "。徒歩で" + Math.ceil(moyoriminutes) + "分です。他に聞きたいことがあれば、もう一度。なければストップと言ってください";
                    image = res[a][14];
                    content = moyoriarray[0]["line"] + moyoriarray[0]["name"] + "駅から" + moyoriarray[0]["distance"] + "。徒歩で" + Math.ceil(moyoriminutes) + "分";
                    console.log("用語対応:" + res[a][3]);
                    log_message = "用語対応:" + res[a][3];
                    break;
                }
                else if(!res[a][3].indexOf(area)){
                    console.log("よくわからないところいった。");
                    message = res[a][3] + "は"　+ res[a][2]+"です。" + res[a][3] + "。他に聞きたいことがあれば、もう一度。なければストップと言ってください";
                }
            }
            console.log("用語非対応:" + area);
        }
        else{
            console.log("対応なし");
            log_message = "対応なし";
            message = "申し訳ありません。もう一度お願いいたします。";
            const xzahyou = res[1][9];
            const yzahyou = res[1][8];
            const moyori = request('GET', 'http://express.heartrails.com/api/json?method=getStations&x='+xzahyou+'&y='+yzahyou);
            const moyoriarray = [JSON.parse(moyori.getBody('utf8'))["response"]["station"][0]];
            return handlerInput.responseBuilder
                .speak(res[1][3]+moyoriarray[0]["distance"])
                .getResponse();
        }

        if (supportsDisplay(handlerInput) ) {
            const title = '最寄り駅情報';
            if(log_message === "")log_message = "用語非対応:" + area;
            const backgroundImage = new Alexa.ImageHelper()
                .addImageInstance(image)
                .getImage();
            const token = 'TOKEN';
            let textContent = new Alexa.RichTextContentHelper()
                .withTertiaryText(content)
                .getTextContent();
            handlerInput.responseBuilder.addRenderTemplateDirective({
                type: 'BodyTemplate1',
                backButton: 'VISIBLE',
                backgroundImage: backgroundImage,
                title: title,
                textContent: textContent,
                token: token,
            });
            return new Promise((resolve) => {
                readFromS3().then(function(result){
                    writeToS3(result.Body.toString(), log_message).then(() => {
                        resolve(handlerInput.responseBuilder
                            .speak(message)
                            .reprompt(message)
                            .getResponse());
                    });
                });
            });
        }
        log_message = "用語非対応:" + area;
        console.log("用語非対応:" + area);
        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(message)
            .getResponse();

    }
};

//画像を選択した際の処理
const ElementSelected = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'Display.ElementSelected')
    },async handle (handlerInput){
        let speechText = "新美南吉の自筆原稿や書簡などを収蔵・展示する記念文学館。「ごんぎつね」の舞台となった地に建てられています。より詳しい情報はこちらのキューアールコードにてホームページを参照してください";
        let urlimage = "";
        let log_message = "";
        let title = "";
        switch (handlerInput.requestEnvelope.request.token) {
            case "一番":
                title = firstmessage;
                speechText = first_description;
                urlimage = firsturl;
                break;
            case "二番":
                title = secondmessage;
                speechText = second_description;
                urlimage = secondurl;
                break;
            case "三番":
                title = thirdmessage;
                speechText = third_description;
                urlimage = thirdurl;
                break;
        }

        log_message = "選択されたもの" + title;
        console.log("選択されたもの" + title);
        const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance(urlimage)
            .getImage();
        const token = 'TOKEN';
        return new Promise((resolve) => {
            readFromS3().then(function(result){
                writeToS3(result.Body.toString(), log_message).then(() => {
                    resolve(handlerInput.responseBuilder
                        .speak(speechText)
                        .addRenderTemplateDirective({
                            type: 'BodyTemplate1',
                            backButton: 'VISIBLE',
                            backgroundImage: backgroundImage,
                            title: title,
                            token: token,
                        })
                        .withShouldEndSession(true)
                        .getResponse());
                });
            });
        });
    }
};

const CategoryHandler = {
  canHandle (handlerInput) {
      return canHandle(handlerInput, 'IntentRequest', 'CategoryIntent')
  },
    handle (handlerInput) {
      const category = getSlotValueByName(handlerInput, 'ca');
      const message = "オススメのスポットが三つ見つかりました。画面にタッチするか、1番,2番,3番と番号を話してください。";
      const title = 'オススメの観光スポット';
      let log_message = "";
      let template = create_background_img(firsturl, title);

        if(category === "カップル"){
            console.log("観光分岐:カップル");
            log_message = "観光分岐:カップル";
            firsturl = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/6_nakikinen.JPG";
            firstmessage = "新美南吉記念館";
            first_description = "新美南吉の自筆原稿や書簡などを収蔵・展示する記念文学館。「ごんぎつね」の舞台となった地に建てられています。童話の森には、文学碑や作品に登場する植物が観察できる遊歩道があります。";
            secondurl = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/23_handa.JPG";
            secondmessage = "半田運河";
            second_description = "春には鯉のぼりが優雅に泳ぎ、夏の夜には運河の水面を無数のヒカリノ玉が彩るCanal Nightが開催されます。様々なイベントだけでなく、潮風とともに四季の移ろいが感じられる散策スポットとして人々に愛されています。";
            thirdurl = "https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/5_teien.JPG";
            thirdmessage = "半六庭園";
            third_description = "江戸時代から海運業、醸造業でさかえ、代々地元の発展に貢献した名家、中埜半六家。その庭園を、市民の憩いの場として整備し半田市を訪れる方々のおもてなしの場となっています。";
            template = create_three_images(firstmessage,secondmessage,thirdmessage,firsturl,secondurl,thirdurl);
        }else if(category === "見る"){
            console.log("観光分岐:見る");
            log_message = "観光分岐:見る";
            firsturl = res[1][14];
            firstmessage = res[1][3];
            first_description = res[1][10];
            secondurl = res[9][14];
            secondmessage = res[9][3];
            second_description = res[9][10];
            thirdurl = res[10][14];
            thirdmessage = res[10][3];
            third_description = res[10][10];
            template = create_three_images(firstmessage,secondmessage,thirdmessage,firsturl,secondurl,thirdurl);
        }else if(category === "遊ぶ"){
            console.log("観光分岐:遊ぶ");
            log_message = "観光分岐:遊ぶ";
            firsturl = res[1][14];
            firstmessage = res[1][3];
            first_description = res[1][10];
            secondurl = res[9][14];
            secondmessage = res[9][3];
            second_description = res[9][10];
            thirdurl = res[10][14];
            thirdmessage = res[10][3];
            third_description = res[10][10];
            template = create_three_images(firstmessage,secondmessage,thirdmessage,firsturl,secondurl,thirdurl);
        }else if(category === "食べる"){
            console.log("観光分岐:食べる");
            log_message = "観光分岐:食べる";
        }else if(category === "歴史"){
            console.log("観光分岐:歴史");
            log_message = "観光分岐:歴史";
        }else if(category === "公園"){
            console.log("観光分岐:公園");
            log_message = "観光分岐:公園";
        }else if(category === "美術館"){
            console.log("観光分岐:美術館");
            log_message = "観光分岐:美術館";
        }else if(category === "体験"){
            console.log("観光分岐:体験");
            log_message = "観光分岐:体験";
        }else if(category === "温泉"){
            console.log("観光分岐:温泉");
            log_message = "観光分岐:温泉";
        }
        else{
            console.log("該当のスポット無し:" + category);
            log_message = "該当のスポット無し:" + category;
            let randoms = generate_random3();
            const random1 = randoms[0];
            const random2 = randoms[1];
            const random3 = randoms[2];
            firsturl = res[random1][14];
            firstmessage = res[random1][3];
            first_description = res[random1][10];
            secondurl = res[random2][14];
            secondmessage = res[random2][3];
            second_description = res[random2][10];
            thirdurl = res[random3][14];
            thirdmessage = res[random3][3];
            third_description = res[random3][10];
            template = create_three_images(firstmessage,secondmessage,thirdmessage,firsturl,secondurl,thirdurl);
        }
        if (supportsDisplay(handlerInput) ) {

            return new Promise((resolve) => {
                readFromS3().then(function(result){
                    writeToS3(result.Body.toString(), log_message).then(() => {
                        resolve(handlerInput.responseBuilder
                            .speak(message)
                            .reprompt(message)
                            .addRenderTemplateDirective(template)
                            .getResponse());
                    });
                });
            });
        }else{
            const output = "1番" + firstmessage + "2番" +secondmessage + "3番" + thirdmessage;
            return handlerInput.responseBuilder
                .speak(output + message)
                .reprompt(output + message)
                .getResponse();
        }
    }
};

const EventHandler = {
  canHandle (handlerInput) {
      return canHandle(handlerInput, 'IntentRequest', 'EventIntent')
  },
    async handle (handlerInput) {
        let eventslist = [];
        let eventstime = [];
        let imageurl = [];
        let log_message = "";
        let client = require('cheerio-httpcli');
        let result = await client.fetch('https://www.handa-kankou.com/event/')
            .then(function (result) {
                let $ = result.$;
// リンク一覧を表示
                $('.events__title').each(function () {
                    eventslist.push($(this).text());
                });
                $('.startday').each(function () {
                    eventstime.push($(this).text());
                });
                $('.events__thumb > a > img').each(function () {
                    imageurl.push($(this).attr("src"));
                });
                return [eventslist,eventstime,imageurl];
            }).then(function (result){
                log_message = "観光分岐:見る";
                console.log(result[0]);
                return result
            });
        let message = "イベント名:"+result[0][0]+ "。開催日時:" +result[1][0];
        let content = "イベント名:"+result[0][0]+ "。<br/>開催日時:<br/>" +result[1][0];
        if (supportsDisplay(handlerInput) ) {
            const title = 'イベント情報';
            const backgroundImage = new Alexa.ImageHelper()
                .addImageInstance("https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/qr/event.png")
                .getImage();
            const forgroundImage = new Alexa.ImageHelper()
                .addImageInstance(result[2][0])
                .getImage();
            const token = 'TOKEN';
            const textContent = new Alexa.RichTextContentHelper()
                .withPrimaryText(content)
                .getTextContent();

            return new Promise((resolve) => {
                readFromS3().then(function(result){
                    writeToS3(result.Body.toString(), log_message).then(() => {
                        resolve(handlerInput.responseBuilder
                            .speak(message + "。詳しく、知りたい方は右下のQRコードを読み込んでください！他に聞きたいことがあれば、もう一度。なければストップと言ってください")
                            .addRenderTemplateDirective({
                                type: 'BodyTemplate3',
                                backButton: 'VISIBLE',
                                backgroundImage: backgroundImage,
                                image: forgroundImage,
                                title: title,
                                textContent: textContent,
                                token: token,
                            })
                            .reprompt("他に聞きたいことがあれば、もう一度。なければストップと言ってください")
                            .getResponse());
                    });
                });
            });
        }
        return handlerInput.responseBuilder
            .speak(message)
            .getResponse();
    }
};

const ChoiceHandler = {
  canHandle (handlerInput) {
      return canHandle(handlerInput, 'IntentRequest', 'ChoiceNumberIntent')
  },
    handle (handlerInput){
        let message = "該当のものがありませんでした。申し訳ありませんがもう一度お願いいたします。";
        let title = "";
        const number = getSlotValueByName(handlerInput, 'number');
        let template = "";
        let log_message = "";
        if(number == 1){
            message = first_description;
            title = firstmessage;
            log_message = "選ばれた番号:" + firstmessage;
                template = create_background_img(firsturl, firstmessage)
        }else if(number == 2){
            message = second_description;
            title = secondmessage;
            log_message = "選ばれた番号:" + secondmessage;
            template = create_background_img(secondurl, secondmessage);
        }else if(number == 3){
            message = third_description;
            title = thirdmessage;
            log_message = "選ばれた番号:" + thirdmessage;
            template = create_background_img(thirdurl, thirdmessage);
        }
        else{
            return handlerInput.responseBuilder
                .speak(message)
                .reprompt(message)
                .getResponse();
        }
        if (supportsDisplay(handlerInput) ) {
            return new Promise((resolve) => {
                readFromS3().then(function(result){
                    writeToS3(result.Body.toString(), log_message).then(() => {
                        resolve(handlerInput.responseBuilder
                            .speak(title + "は" + message + "。他に聞きたいことがあれば、もう一度。なければストップと言ってください")
                            .reprompt("他に聞きたいことがあれば、もう一度。なければストップと言ってください")
                            .addRenderTemplateDirective(template)
                            .getResponse());
                    });
                });
            });
        }else{
            return handlerInput.responseBuilder
                .speak(message)
                .reprompt(message)
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'AMAZON.HelpIntent')
    },
    handle (handlerInput) {
        const speechText = HELP_MESSAGE;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse()
    }
};

const NextHandler = { canHandle(handlerInput) {
    return canHandle(handlerInput, 'IntentRequest', 'AMAZON.NextIntent')
},
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(HELP_MESSAGE)
            .reprompt(HELP_MESSAGE)
            .getResponse();
    }
};

const PreviousHandler = { canHandle(handlerInput) {
    return canHandle(handlerInput, 'IntentRequest', 'AMAZON.PreviousIntent')
},
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(HELP_MESSAGE)
            .reprompt(HELP_MESSAGE)
            .getResponse();
    }
};

const ExitHandler = {
    canHandle(handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'AMAZON.CancelIntent')
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(STOP_MESSAGE)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const Exit2Handler = {
    canHandle(handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'AMAZON.StopIntent')
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(STOP_MESSAGE)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const UnHandler = {
    canHandle(handlerInput) {
        return canHandle(handlerInput, 'Unhandled')
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(HELP_MESSAGE)
            .reprompt(HELP_MESSAGE)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return canHandle(handlerInput, 'SessionEndedRequest')
    },
    handle(handlerInput) {
        console.log(`SessionEnd`);
        return handlerInput.responseBuilder.withShouldEndSession(true).getResponse();
    },
};

function supportsDisplay(handlerInput) {
    var hasDisplay =
        handlerInput.requestEnvelope.context &&
        handlerInput.requestEnvelope.context.System &&
        handlerInput.requestEnvelope.context.System.device &&
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display
    return hasDisplay;
}

// function scraiping(){
//     let eventslist = [];
//     let client = require('cheerio-httpcli');
//     client.fetch('https://www.handa-kankou.com/event/')
//         .then(function (result) {
//             let $ = result.$;
// // リンク一覧を表示
//             $('.events__title').each(function () {
//                 eventslist.push($(this).text());
//             });
//             return eventslist
//         }).then(function (result){
//             console.log(result[0]);
//             return result[0];
//     });
// }

function create_three_images(name1,name2,name3,url1,url2,url3){
    const image = new Alexa.ImageHelper()
        .addImageInstance(url1)
        .getImage();
    const textContent = new Alexa.PlainTextContentHelper()
        .withPrimaryText(name1)
        .getTextContent();
    const image2 = new Alexa.ImageHelper()
        .addImageInstance(url2)
        .getImage();
    const textContent2 = new Alexa.PlainTextContentHelper()
        .withPrimaryText(name2)
        .getTextContent();
    const image3 = new Alexa.ImageHelper()
        .addImageInstance(url3)
        .getImage();
    const textContent3 = new Alexa.PlainTextContentHelper()
        .withPrimaryText(name3)
        .getTextContent();
    let firstselect = {
        token : '一番',
        image : image,
        textContent : textContent
    };
    let secondselect = {
        token : '二番',
        image : image2,
        textContent : textContent2
    };
    let thirdselect = {
        token : '三番',
        image : image3,
        textContent : textContent3
    };

    const title = 'オススメの観光スポット';
    const backgroundImage = new Alexa.ImageHelper()
        .addImageInstance('https://s3-ap-northeast-1.amazonaws.com/hnd-kanko/higanbana.jpg')
        .getImage();
    const token = 'TOKEN';

    return {
        type: 'ListTemplate2',
        backButton: 'HIDDEN',
        listItems:  [firstselect, secondselect, thirdselect],
        backgroundImage: backgroundImage,
        title: title,
        token : token,
    };
}

function create_background_img(imgurl, title){
    const backgroundImage = new Alexa.ImageHelper()
        .addImageInstance(imgurl)
        .getImage();
    return {
            type: 'BodyTemplate1',
            backButton: 'VISIBLE',
            backgroundImage: backgroundImage,
            title: title,
            token: "TOKEN",
        };
}

return new Promise((resolve) => {
    readFromS3().then(function(result){
        writeToS3(result.Body.toString(), log_message).then(() => {
            resolve(handlerInput.responseBuilder
                .speak(message)
                .reprompt(message)
                .getResponse());
        });
    });
});

function writeToS3(nowtxt, addtxt) {
    let timestamp = nowtime();

    let result = new Promise((resolve, reject) => {

        const putParams = {
            Bucket: dstBucket,
            Key: 'test.txt',
            Body: nowtxt + " \n" + addtxt + "," + timestamp
        };

        s3.putObject(putParams, function (putErr, putData) {
            if (putErr) {
                console.log("エラーです。")
                console.error(putErr);
                reject(putErr);
            }else {
                console.log('S3 Upload complete');
                resolve(putData);
            }
        });
        console.log("Uploading To S3")
    });

    return result;

}

function readFromS3() {
    const res = {
        statusCode: 200,
    };
    let result = new Promise((resolve, reject) => {

        const paramsToGet = {
            Bucket: dstBucket,
            Key: 'test.txt'
        };

        s3.getObject(paramsToGet, function (err, data) {
            if (err) {
                console.log(err);
                reject(err);
            }else {
                res.body = data.Body.toString();
                resolve(data)
            }
        });

    });
    return result;
}

function generate_random3(){
    let randoms = [];
    let csv_min = 1;
    let csv_length = 28;

    for(let i=0;i<3;i++){
        while(true){
            let tmp = Math.floor( Math.random() * (csv_length - csv_min + 1)) + csv_min;;
            if(!randoms.includes(tmp)){
                randoms.push(tmp);
                break;
            }
        }
    }
    return randoms
}

function nowtime(){
    today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let day = today.getDate();
    let hour = today.getHours() + 9;
    let minute = today.getMinutes();
    let second = today.getSeconds();
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second
}