const network = require("../../../../utils/main.js");
const app = getApp();
var search = '';

Page({
    data: {
        base: '../../../../',
        showEmpty: false,
        list: []
    },
    onLoad: function(options) {
        this.compontNavbar = this.selectComponent("#compontNavbar");
        this.empty = this.selectComponent("#empty");
    },
    onShow() {
        var that = this;
        that.getList();
    },
  onShow: function () {
    var that = this;
    that.component = that.selectComponent("#component")
    that.component.customMethod()
  },
  onHide: function () {
    var that = this;
    that.component = that.selectComponent("#component")
    that.component.noShow()
    that.component.nohide()
  },
    getList() {
        var that = this; 
        network.getMsgFrdList(function(res){
            console.log(res);
            var a = res.data.data;
            that.setData({
                list: a,
                showEmpty: a.length == 0? true: false
            });
        });
    },
    // inputFn(e) {
    //     search = e.detail.value.replace(/^\s*|\s*$/, '');
    //     console.log(search);
    // },
    asideSearch(e) {
        var a = e.target.dataset.search;
        console.log(a);
    },
    toDetail(e) {
        var a = e.currentTarget.dataset;
        wx.navigateTo({
            url: '/pages/msg/pages/frdDetail/frdDetail?id=' + a.id + '&mobile=' + a.mobile
        })
    },
    toNewFrd(){
        wx.navigateTo({
            url: '/pages/msg/pages/newFrd/newFrd'
        })
    },
    toGroupList(){
        wx.navigateTo({
            url: '/pages/msg/pages/groupList/groupList'
        })
    },
    onUnload: function() {

    }
})