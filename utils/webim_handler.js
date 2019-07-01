const webim = require('webim_wx.min.js');
var selToID
    ,loginInfo
    ,accountMode
    ,accountType
    ,sdkAppID
    ,avChatRoomId
    ,selType
    ,selToID
    ,selSess
    ,selSessHeadUrl
    ,memberCount = 0; //观看人数
//监听大群新消息（普通，点赞，提示，红包）
function onBigGroupMsgNotify(msgList,callback) {
    // console.log(msgList);
    for (var i = msgList.length - 1; i >= 0; i--) {
        var msg = msgList[i];
        //console.warn(msg);
        webim.Log.warn('receive a new avchatroom group msg: ' + msg.getFromAccountNick());
        callback(showMsg(msg));
    }
}

//监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
function onMsgNotify(newMsgList) {
    var newMsg;
    for (var j in newMsgList) {
        newMsg = newMsgList[j];
        // console.log(newMsg);
        handlderMsg(newMsg);
    }
}

//处理消息（私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息）
function handlderMsg(msg) {
    var fromAccount, fromAccountNick, sessType, subType, contentHtml;

    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = fromAccount;
    }

    sessType = msg.getSession().type();
    subType = msg.getSubType();

    switch (sessType) {
        case webim.SESSION_TYPE.C2C://私聊消息
            switch (subType) {
                case webim.C2C_MSG_SUB_TYPE.COMMON:
                    contentHtml = convertMsgtoHtml(msg);
                    webim.Log.warn('receive a new c2c msg: fromAccountNick=' + fromAccountNick + ", content=" + contentHtml);
                    var opts = {
                        'To_Account': fromAccount,
                        'LastedMsgTime': msg.getTime()
                    };
                    webim.c2CMsgReaded(opts);
                    console.error('收到一条c2c消息(好友消息或者全员推送消息): 发送人=' + fromAccountNick + ", 内容=" + contentHtml);
                    break;
            }
            break;
        case webim.SESSION_TYPE.GROUP:
            break;
    }
}

//sdk登录
function sdkLogin(userInfo, listeners, options, avChatRoomId, callback) {
    //web sdk 登录
    webim.login(userInfo, listeners, options,
        function (identifierNick) {
            // webim.Log.info('webim登录成功');
            loginInfo = userInfo;
            setProfilePortrait({
                'ProfileItem': [{
                    "Tag": "Tag_Profile_IM_Nick",
                    "Value": userInfo.identifierNick
                }]
            },function(){
                // console.log('roomid====>', avChatRoomId);
                if (callback){
                    callback();
                }else{
                    applyJoinBigGroup(avChatRoomId);
                }
            })
        },
        function (err) {
            console.error(err.ErrorInfo);
        }
    );
}

//修改昵称
function setProfilePortrait(options,callback){
    webim.setProfilePortrait(options,
        function(res){
            webim.Log.info('修改昵称成功');
            callback && callback();
        },
        function(){

        }
    );
}

//进入大群
function applyJoinBigGroup(groupId) {
    var options = {
        'GroupId': groupId,
        'ApplyMsg': '',
        'UserDefinedField': ''
    };
    // console.log(options);
    webim.applyJoinBigGroup(
        options,
        function (resp) {
            if (resp.JoinedStatus && resp.JoinedStatus == 'JoinedSuccess') {
                webim.Log.info('进群成功');
                selToID = groupId;
                getGroupInfo(groupId, function(res){
                    memberCount = res.GroupInfo[0].MemberNum;
                });
                getGroupMemberInfo(groupId);
            } else {
                console.error('进群失败');
            }
        },
        function (err) {
            console.error(err.ErrorInfo);
        }
    );
}
//群资料
function getGroupInfo(group_id, cbOK, cbErr) {
    var options = {
        'GroupIdList': [
            group_id
        ],
        'GroupBaseInfoFilter': [
            'Type',
            'Name',
            'Introduction',
            'Notification',
            'FaceUrl',
            'CreateTime',
            'Owner_Account',
            'LastInfoTime',
            'LastMsgTime',
            'NextMsgSeq',
            'MemberNum',
            'MaxMemberNum',
            'ApplyJoinOption'
        ],
        'MemberInfoFilter': [
            'Account',
            'Role',
            'JoinTime',
            'LastSendMsgTime',
            'ShutUpUntil'
        ]
    };
    webim.getGroupInfo(
        options,
        function (resp) {
            // console.log(resp);
            if (cbOK) {
                cbOK(resp);
            }
        },
        function (err) {
            console.log(err.ErrorInfo);
        }
    );
};
//获取观看人数
function getMemberCount() {
    return memberCount;
}
//读取群组成员
function getGroupMemberInfo(group_id) {
    // initGetGroupMemberTable([]);
    var options = {
        'GroupId': group_id,
        'Offset': 0,
        'Limit': 10,
        'MemberInfoFilter': [
            'Account',
            'Role',
            'JoinTime',
            'LastSendMsgTime',
            'ShutUpUntil'
        ]
    };
    webim.getGroupMemberInfo(
        options,
        function (resp) {
            if (resp.MemberNum <= 0) {
                console.log('该群组目前没有成员');
                return;
            }
            console.log('群成员信息---------------');
            console.log(resp);
            var data = [];
            for (var i in resp.MemberList) {
                var account = resp.MemberList[i].Member_Account;
                var role = webim.Tool.groupRoleEn2Ch(resp.MemberList[i].Role);
                var join_time = webim.Tool.formatTimeStamp(
                    resp.MemberList[i].JoinTime);
                var shut_up_until = webim.Tool.formatTimeStamp(
                    resp.MemberList[i].ShutUpUntil);
                if (shut_up_until == 0) {
                    shut_up_until = '-';
                }
                data.push({
                    GroupId: group_id,
                    Member_Account: account,
                    Role: role,
                    JoinTime: join_time,
                    ShutUpUntil: shut_up_until
                });
            }
        },
        function (err) {
            console.log(err.ErrorInfo);
        }
    );
};
//显示消息（群普通+点赞+提示+红包）
function showMsg(msg) {
    // console.log(msg);
    var isSelfSend, fromAccount, fromAccountNick, sessType, subType;
    var ul, li, paneDiv, textDiv, nickNameSpan, contentSpan;

    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = '未知用户';
    }
    //解析消息
    //获取会话类型，目前只支持群聊
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();

    isSelfSend = msg.getIsSend();//消息是否为自己发的
    var content = "";
    switch (subType) {

        case webim.GROUP_MSG_SUB_TYPE.COMMON://群普通消息
            content = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.REDPACKET://群红包消息
            content = "[群红包消息]" + convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.LOVEMSG://群点赞消息
            content = "[群点赞消息]" + convertMsgtoHtml(msg);
            // showLoveMsgAnimation();
            break;
        case webim.GROUP_MSG_SUB_TYPE.TIP://群提示消息
            content = "[群提示消息]" + convertMsgtoHtml(msg);
            break;
    }

    return {
        fromAccountNick : fromAccountNick,
        content : content
    }
}

//把消息转换成Html
function convertMsgtoHtml(msg) {
    // console.log(msg);
    var html = "", elems, elem, type, content;
    elems = msg.getElems();//获取消息包含的元素数组
    // console.log(elems);
    for (var i in elems) {
        elem = elems[i];
        type = elem.getType();//获取元素类型
        content = elem.getContent();//获取元素对象
        switch (type) {
            case webim.MSG_ELEMENT_TYPE.TEXT:
                html += convertTextMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.FACE:
                html += convertFaceMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.IMAGE:
                html += convertImageMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.SOUND:
                html += convertSoundMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.FILE:
                html += convertFileMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.LOCATION://暂不支持地理位置
                //html += convertLocationMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.CUSTOM:
                html += convertCustomMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.GROUP_TIP:
                html += convertGroupTipMsgToHtml(content);
                break;
            default:
                webim.Log.error('未知消息元素类型: elemType=' + type);
                break;
        }
    }
    // console.log('html=====',html);
    return webim.Tool.formatHtml2Text(html);
}

//解析文本消息元素
function convertTextMsgToHtml(content) {
    return content.getText();
}
//解析表情消息元素
function convertFaceMsgToHtml(content) {
    return content.getData();
    return content;
    var faceUrl = null;
    var data = content.getData();
    var index = webim.EmotionDataIndexs[data];

    var emotion = webim.Emotions[index];
    if (emotion && emotion[1]) {
        faceUrl = emotion[1];
    }
    if (faceUrl) {
        return "<img src='" + faceUrl + "'/>";
    } else {
        return data;
    }
}
//解析图片消息元素
function convertImageMsgToHtml(content) {
    var smallImage = content.getImage(webim.IMAGE_TYPE.SMALL);//小图
    var bigImage = content.getImage(webim.IMAGE_TYPE.LARGE);//大图
    var oriImage = content.getImage(webim.IMAGE_TYPE.ORIGIN);//原图
    if (!bigImage) {
        bigImage = smallImage;
    }
    if (!oriImage) {
        oriImage = smallImage;
    }
    return "<img src='" + smallImage.getUrl() + "#" + bigImage.getUrl() + "#" + oriImage.getUrl() + "' style='CURSOR: hand' id='" + content.getImageId() + "' bigImgUrl='" + bigImage.getUrl() + "' onclick='imageClick(this)' />";
}
//解析语音消息元素
function convertSoundMsgToHtml(content) {
    var second = content.getSecond();//获取语音时长
    var downUrl = content.getDownUrl();
    if (webim.BROWSER_INFO.type == 'ie' && parseInt(webim.BROWSER_INFO.ver) <= 8) {
        return '[这是一条语音消息]demo暂不支持ie8(含)以下浏览器播放语音,语音URL:' + downUrl;
    }
    return '<audio src="' + downUrl + '" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
}
//解析文件消息元素
function convertFileMsgToHtml(content) {
    var fileSize = Math.round(content.getSize() / 1024);
    return '<a href="' + content.getDownUrl() + '" title="点击下载文件" ><i class="glyphicon glyphicon-file">&nbsp;' + content.getName() + '(' + fileSize + 'KB)</i></a>';

}
//解析位置消息元素
function convertLocationMsgToHtml(content) {
    return '经度=' + content.getLongitude() + ',纬度=' + content.getLatitude() + ',描述=' + content.getDesc();
}
//解析自定义消息元素
function convertCustomMsgToHtml(content) {
    var data = content.getData();
    var desc = content.getDesc();
    var ext = content.getExt();
    return "data=" + data + ", desc=" + desc + ", ext=" + ext;
}
//解析群提示消息元素
function convertGroupTipMsgToHtml(content) {
    var WEB_IM_GROUP_TIP_MAX_USER_COUNT = 10;
    var text = "";
    var maxIndex = WEB_IM_GROUP_TIP_MAX_USER_COUNT - 1;
    var opType, opUserId, userIdList;
    opType = content.getOpType();//群提示消息类型（操作类型）
    opUserId = content.getOpUserId();//操作人id
    switch (opType) {
        case webim.GROUP_TIP_TYPE.JOIN://加入群
            userIdList = content.getUserIdList();
            //text += opUserId + "邀请了";
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text = text.substring(0, text.length - 1);
            text += "进入房间";
            //房间成员数加1
            getGroupInfo(avChatRoomId, function (res) {
                memberCount = res.GroupInfo[0].MemberNum;
            });
            break;
        case webim.GROUP_TIP_TYPE.QUIT://退出群
            text += opUserId + "离开房间";
            //房间成员数减1
            getGroupInfo(avChatRoomId, function (res) {
                memberCount = res.GroupInfo[0].MemberNum;
            });
            break;
        case webim.GROUP_TIP_TYPE.KICK://踢出群
            text += opUserId + "将";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "踢出该群";
            break;
        case webim.GROUP_TIP_TYPE.SET_ADMIN://设置管理员
            text += opUserId + "将";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "设为管理员";
            break;
        case webim.GROUP_TIP_TYPE.CANCEL_ADMIN://取消管理员
            text += opUserId + "取消";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "的管理员资格";
            break;

        case webim.GROUP_TIP_TYPE.MODIFY_GROUP_INFO://群资料变更
            text += opUserId + "修改了群资料：";
            var groupInfoList = content.getGroupInfoList();
            var type, value;
            for (var m in groupInfoList) {
                type = groupInfoList[m].getType();
                value = groupInfoList[m].getValue();
                switch (type) {
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.FACE_URL:
                        text += "群头像为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NAME:
                        text += "群名称为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.OWNER:
                        text += "群主为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NOTIFICATION:
                        text += "群公告为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.INTRODUCTION:
                        text += "群简介为" + value + "; ";
                        break;
                    default:
                        text += "未知信息为:type=" + type + ",value=" + value + "; ";
                        break;
                }
            }
            break;

        case webim.GROUP_TIP_TYPE.MODIFY_MEMBER_INFO://群成员资料变更(禁言时间)
            text += opUserId + "修改了群成员资料:";
            var memberInfoList = content.getMemberInfoList();
            var userId, shutupTime;
            for (var m in memberInfoList) {
                userId = memberInfoList[m].getUserId();
                shutupTime = memberInfoList[m].getShutupTime();
                text += userId + ": ";
                if (shutupTime != null && shutupTime !== undefined) {
                    if (shutupTime == 0) {
                        text += "取消禁言; ";
                    } else {
                        text += "禁言" + shutupTime + "秒; ";
                    }
                } else {
                    text += " shutupTime为空";
                }
                if (memberInfoList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + memberInfoList.length + "人";
                    break;
                }
            }
            break;
        default:
            text += "未知群提示消息类型：type=" + opType;
            break;
    }
    // console.log(memberCount);
    return text;
}



//单击图片事件
function imageClick(imgObj) {
    var imgUrls = imgObj.src;
    var imgUrlArr = imgUrls.split("#"); //字符分割
    var smallImgUrl = imgUrlArr[0];//小图
    var bigImgUrl = imgUrlArr[1];//大图
    var oriImgUrl = imgUrlArr[2];//原图
    webim.Log.info("小图url:" + smallImgUrl);
    webim.Log.info("大图url:" + bigImgUrl);
    webim.Log.info("原图url:" + oriImgUrl);
}


//切换播放audio对象
function onChangePlayAudio(obj) {
    if (curPlayAudio) {//如果正在播放语音
        if (curPlayAudio != obj) {//要播放的语音跟当前播放的语音不一样
            curPlayAudio.currentTime = 0;
            curPlayAudio.pause();
            curPlayAudio = obj;
        }
    } else {
        curPlayAudio = obj;//记录当前播放的语音
    }
}


//发送消息(普通消息)
function onSendMsg(msg,callback) {
    // console.log(msg);
    // console.log('accountMode',accountMode);
    if (!loginInfo.identifier) return;
  
    if (!selToID) {
        console.error("您还没有进入房间，暂不能聊天");
        return;
    }
    var msgtosend = msg;
    // console.log(msgtosend);
    var msgLen = webim.Tool.getStrBytes(msg);

    if (msgtosend.length < 1) {
        console.error("发送的消息不能为空!");
        return;
    }

    var maxLen, errInfo;
    if (selType == webim.SESSION_TYPE.GROUP) {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        console.error(errInfo);
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;
    var seq = -1;
    var random = Math.round(Math.random() * 4294967296);
    var msgTime = Math.round(new Date().getTime() / 1000);
    var subType;
    if (selType == webim.SESSION_TYPE.GROUP) {
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON;
    } else {
        subType = webim.C2C_MSG_SUB_TYPE.COMMON;
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    // console.log(msg);
    var expr = /\[[^[\]]{1,3}\]/mg;
    var emotions = msgtosend.match(expr);
    // console.log(emotions);
    var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
    if (!emotions || emotions.length < 1) {
        text_obj = new webim.Msg.Elem.Text(msgtosend);
        // console.log(text_obj);
        msg.addText(text_obj);
    } else {
        for (var i = 0; i < emotions.length; i++) {
            tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
            // console.log(tmsg);
            if (tmsg) {
                text_obj = new webim.Msg.Elem.Text(tmsg);
                msg.addText(text_obj);
            }
            emotionIndex = webim.EmotionDataIndexs[emotions[i]];
            emotion = webim.Emotions[emotionIndex];
            if (emotion) {
                face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
                msg.addFace(face_obj);
            } else {
                text_obj = new webim.Msg.Elem.Text(emotions[i]);
                msg.addText(text_obj);
            }
            restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
            msgtosend = msgtosend.substring(restMsgIndex);
            // console.log(msgtosend);
        }
        if (msgtosend) {
            text_obj = new webim.Msg.Elem.Text(msgtosend);
            console.log(text_obj);
            msg.addText(text_obj);
        }
    }
    // console.log(webim.sendMsg);
    webim.sendMsg(msg, function (resp) {
        console.log(msg);
        // if (selType == webim.SESSION_TYPE.C2C) {
        //     showMsg(msg);
        // }
        showMsg(msg);
        webim.Log.info("发消息成功");
        // console.log(callback)
        callback && callback(resp);
    }, function (err) {
        webim.Log.error("发消息失败:" + err.ErrorInfo);
        // console.error("发消息失败:" + err.ErrorInfo);
    });
}

//发送消息(群点赞消息)
function sendGroupLoveMsg() {

    if (!loginInfo.identifier) {//未登录
        return;
    }

    if (!selToID) {
        console.error("您还没有进入房间，暂不能点赞");
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    //群消息子类型如下：
    //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
    //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
    //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
    //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
    var subType = webim.GROUP_MSG_SUB_TYPE.LOVEMSG;

    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    var msgtosend = 'love_msg';
    var text_obj = new webim.Msg.Elem.Text(msgtosend);
    msg.addText(text_obj);

    webim.sendMsg(msg, function (resp) {
        // console.log(msg);
        if (selType == webim.SESSION_TYPE.C2C) {
            showMsg(msg);
        }
        webim.Log.info("点赞成功");
    }, function (err) {
        webim.Log.error("发送点赞消息失败:" + err.ErrorInfo);
        console.error("发送点赞消息失败:" + err.ErrorInfo);
    });
}


//初始化表情
function initEmotionUL() {
    return;
    for (var index in webim.Emotions) {
        var emotions = $('<img>').attr({
            "id": webim.Emotions[index][0],
            "src": webim.Emotions[index][1],
            "style": "cursor:pointer;"
        }).click(function () {
            selectEmotionImg(this);
        });
        $('<li>').append(emotions).appendTo($('#emotionUL'));
    }
}

//打开或显示表情
function showEmotionDialog() {
    if (openEmotionFlag) {
        openEmotionFlag = false;
        hideDiscussEmotion();
    } else {
        openEmotionFlag = true;
        showDiscussEmotion();
    }
}
//选中表情
function selectEmotionImg(selImg) {
    $("#send_msg_text").val($("#send_msg_text").val() + selImg.id);
}

//退出大群
function quitBigGroup() {
    var options = {
        'GroupId': avChatRoomId//群id
    };
    webim.quitBigGroup(
        options,
        function (resp) {
            webim.Log.info('退群成功');
            selSess = null;
            //webim.Log.error('进入另一个大群:'+avChatRoomId2);
            //applyJoinBigGroup(avChatRoomId2);//加入大群
        },
        function (err) {
            console.error(err.ErrorInfo);
        }
    );
}

//登出
function logout() {
    webim.logout(
        function (resp) {
            webim.Log.info('登出成功');
            loginInfo.identifier = null;
            loginInfo.userSig = null;
        }
    );
}

//解散群组
function destroyGroup(group_id) {
    var options = null;
    if (group_id) {
        options = {
            'GroupId': group_id
        };
    }
    if (options == null) {
        console.log('解散群时，群组ID非法');
        return;
    }
    webim.destroyGroup(
        options,
        function (resp) {},
        function (err) {
            console.log(err.ErrorInfo);
        }
    );
};



//监听 申请加群 系统消息
function onApplyJoinGroupRequestNotify(notify) {
    webim.Log.warn("执行 加群申请 回调：" + JSON.stringify(notify));
    var timestamp = notify.MsgTime;
    var reportTypeCh = "[申请加群]";
    var content = notify.Operator_Account + "申请加入你的群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, timestamp);
}

//监听 申请加群被同意 系统消息
function onApplyJoinGroupAcceptNotify(notify) {
    webim.Log.warn("执行 申请加群被同意 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[申请加群被同意]";
    var content = notify.Operator_Account + "同意你的加群申请，附言：" + notify.RemarkInfo;
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 申请加群被拒绝 系统消息
function onApplyJoinGroupRefuseNotify(notify) {
    webim.Log.warn("执行 申请加群被拒绝 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[申请加群被拒绝]";
    var content = notify.Operator_Account + "拒绝了你的加群申请，附言：" + notify.RemarkInfo;
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 被踢出群 系统消息
function onKickedGroupNotify(notify) {
    webim.Log.warn("执行 被踢出群  回调：" + JSON.stringify(notify));
    var reportTypeCh = "[被踢出群]";
    var content = "你被管理员" + notify.Operator_Account + "踢出该群";
    // showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
    groupSysCallback(content);
}
//监听 解散群 系统消息
function onDestoryGroupNotify(notify) {
    // console.log('///// ',notify);
    webim.Log.warn("执行 解散群 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[群被解散]";
    var content = "群主" + notify.Operator_Account + "已解散该群";
    // showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);

    groupSysCallback(content);
}

function groupSysCallback(msg){
    wx.showToast({
        title: msg,
        icon: 'none',
        duration: 3000,
        success() {
            wx.navigateTo({
                url: '/pages/broadcast/broadcast'
            })
        }
    });
}

//监听 创建群 系统消息
function onCreateGroupNotify(notify) {
    webim.Log.warn("执行 创建群 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[创建群]";
    var content = "你创建了该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 被邀请加群 系统消息
function onInvitedJoinGroupNotify(notify) {
    webim.Log.warn("执行 被邀请加群  回调: " + JSON.stringify(notify));
    var reportTypeCh = "[被邀请加群]";
    var content = "你被管理员" + notify.Operator_Account + "邀请加入该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 主动退群 系统消息
function onQuitGroupNotify(notify) {
    webim.Log.warn("执行 主动退群  回调： " + JSON.stringify(notify));
    var reportTypeCh = "[主动退群]";
    var content = "你退出了该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 被设置为管理员 系统消息
function onSetedGroupAdminNotify(notify) {
    webim.Log.warn("执行 被设置为管理员  回调：" + JSON.stringify(notify));
    var reportTypeCh = "[被设置为管理员]";
    var content = "你被群主" + notify.Operator_Account + "设置为管理员";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 被取消管理员 系统消息
function onCanceledGroupAdminNotify(notify) {
    webim.Log.warn("执行 被取消管理员 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[被取消管理员]";
    var content = "你被群主" + notify.Operator_Account + "取消了管理员资格";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}
//监听 群被回收 系统消息
function onRevokeGroupNotify(notify) {
    webim.Log.warn("执行 群被回收 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[群被回收]";
    var content = "该群已被回收";
    // showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);

    groupSysCallback(content);
}
//监听 用户自定义 群系统消息
function onCustomGroupNotify(notify) {
    webim.Log.warn("执行 用户自定义系统消息 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[用户自定义系统消息]";
    var content = notify.UserDefinedField;//群自定义消息数据
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 群资料变化 群提示消息
function onGroupInfoChangeNotify(groupInfo) {
    webim.Log.warn("执行 群资料变化 回调： " + JSON.stringify(groupInfo));
    var groupId = groupInfo.GroupId;
    var newFaceUrl = groupInfo.GroupFaceUrl;//新群组图标, 为空，则表示没有变化
    var newName = groupInfo.GroupName;//新群名称, 为空，则表示没有变化
    var newOwner = groupInfo.OwnerAccount;//新的群主id, 为空，则表示没有变化
    var newNotification = groupInfo.GroupNotification;//新的群公告, 为空，则表示没有变化
    var newIntroduction = groupInfo.GroupIntroduction;//新的群简介, 为空，则表示没有变化

    if (newName) {
        //更新群组列表的群名称
        //To do
        webim.Log.warn("群id=" + groupId + "的新名称为：" + newName);
    }
}

//显示一条群组系统消息
function showGroupSystemMsg(type, typeCh, group_id, group_name, msg_content, msg_time, callback) {
    var sysMsgStr = "收到一条群系统消息: type=" + type + ", typeCh=" + typeCh + ",群ID=" + group_id + ", 群名称=" + group_name + ", 内容=" + msg_content + ", 时间=" + webim.Tool.formatTimeStamp(msg_time);
    webim.Log.warn(sysMsgStr);
    // console.error(msg_content);
    onSendMsg(msg_content);
}

function init(opts){
    accountMode = opts.accountMode;
    accountType = opts.accountType;
    sdkAppID = opts.sdkAppID;
    avChatRoomId = opts.avChatRoomId;
    selType = opts.selType;
    selToID = opts.selToID;
}

module.exports = {
    init : init,
    onBigGroupMsgNotify : onBigGroupMsgNotify,
    onMsgNotify : onMsgNotify,
    handlderMsg : handlderMsg,
    sdkLogin : sdkLogin,
    applyJoinBigGroup : applyJoinBigGroup,
    showMsg : showMsg,
    convertMsgtoHtml : convertMsgtoHtml,
    convertTextMsgToHtml : convertTextMsgToHtml,
    convertFaceMsgToHtml : convertFaceMsgToHtml,
    convertImageMsgToHtml : convertImageMsgToHtml,
    convertSoundMsgToHtml : convertSoundMsgToHtml,
    convertFileMsgToHtml : convertFileMsgToHtml,
    convertLocationMsgToHtml : convertLocationMsgToHtml,
    convertCustomMsgToHtml : convertCustomMsgToHtml,
    convertGroupTipMsgToHtml : convertGroupTipMsgToHtml,
    imageClick : imageClick,
    onChangePlayAudio : onChangePlayAudio,
    onSendMsg : onSendMsg,
    sendGroupLoveMsg : sendGroupLoveMsg,
    initEmotionUL : initEmotionUL,
    showEmotionDialog : showEmotionDialog,
    selectEmotionImg : selectEmotionImg,
    quitBigGroup : quitBigGroup,
    destroyGroup: destroyGroup,
    logout : logout,
    onApplyJoinGroupRequestNotify : onApplyJoinGroupRequestNotify,
    onApplyJoinGroupAcceptNotify : onApplyJoinGroupAcceptNotify,
    onApplyJoinGroupRefuseNotify : onApplyJoinGroupRefuseNotify,
    onKickedGroupNotify : onKickedGroupNotify,
    onDestoryGroupNotify : onDestoryGroupNotify,
    onCreateGroupNotify : onCreateGroupNotify,
    onInvitedJoinGroupNotify : onInvitedJoinGroupNotify,
    onQuitGroupNotify : onQuitGroupNotify,
    onSetedGroupAdminNotify : onSetedGroupAdminNotify,
    onCanceledGroupAdminNotify : onCanceledGroupAdminNotify,
    onRevokeGroupNotify : onRevokeGroupNotify,
    onCustomGroupNotify : onCustomGroupNotify,
    onGroupInfoChangeNotify : onGroupInfoChangeNotify,
    showGroupSystemMsg : showGroupSystemMsg,
    getMemberCount: getMemberCount
};