"use strict";
var global = {};
firebase.initializeApp({
    apiKey: 'AIzaSyAztP51SJ4vinKH_o6fnZ-agp6DwdBfsj4',
    authDomain: 'wtsapproject.firebaseapp.com',
    projectId: 'wtsapproject'
});

// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

// Disable deprecated features
db.settings({
    timestampsInSnapshots: true
});

db.collection("users").doc("userid1")
    .onSnapshot(function (doc) {
        console.log("Current data: ", doc.data());
        if (doc.data().isActive) {
            global.isActive = doc.data().isActive;
            $(".isConnected").text("mood");
            $(".isConnected").addClass('isActive');
            $(".isConnected").prop('title', 'Session active');
        } else {
            global.isActive = doc.data().isActive;
            $(".isConnected").text("sentiment_very_dissatisfied");
            $(".isConnected").removeClass('isActive');
            $(".isConnected").prop('title', 'No active session');
            $("#startSessionNav").prop('disabled', false);
            $("#manageContactsNav").prop('disabled', false);
        }
    });
$.fn.dataTable.render.ellipsis = function (cutoff, wordbreak, escapeHtml) {
    var esc = function (t) {
        return t
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    return function (d, type, row) {
        // Order, search and type get the original data
        if (type !== 'display') {
            return d;
        }

        if (typeof d !== 'number' && typeof d !== 'string') {
            return d;
        }

        d = d.toString(); // cast numbers

        if (d.length < cutoff) {
            return d;
        }

        var shortened = d.substr(0, cutoff - 1);

        // Find the last white space character in the string
        if (wordbreak) {
            shortened = shortened.replace(/\s([^\s]*)$/, '');
        }

        // Protect against uncontrolled HTML input
        if (escapeHtml) {
            shortened = esc(shortened);
        }

        return '<span class="ellipsis" title="' + esc(d) + '">' + shortened + '&#8230;</span>';
    };
};

global.apiurl = 'http://localhost:4001/api/';
global.cRecord = {};
$.fn.dataTable.ext.errMode = 'none';
var isLoggedIn = false, isLI;
global.dtob = {};
global.dtap = {};
global.msg_s_i = `<i class='fas fa-redo fa-spin text-info'></i>`;
global.msg_s_s = `<i class='fas fa-check-circle text-success'></i>`;
global.msg_s_f = `<i class='fas fa-times-circle text-danger'></i>`;
global.msg_s_w=`<span class="fa-stack">
                    <i class="fas fa-circle fa-stack-2x"></i>
                    <i class="fas fa-ellipsis-h fa-stack-1x fa-inverse"></i>
                </span>`;
var ifStopSendingMsg = false;
var currentMsgRow = 0;
global.contactObject = {"stepNo":100001,"stepCheckBox":'<input type="checkbox" class="c_select" />',
                        "contactName":"__BLANK__","contactNumber":"",
                        "type": "",
                        "id": 0,
                        "text": "",
                        "delta": "",
                        "url": "",
                        "fName": "",
                        "data": [{
                            "text": "",
                            "delta": "",
                            "url": "",
                            "fName": ""
                        }]};
global.copyMessageData = {};
global.editRecordData = {};
$(window).on("beforeunload", function() { 
     $.ajax({
     url : `${global.apiurl}windowclosed`,
     async : true,
     dataType : 'json'
     })
});

window.onload = function(){
    $(".loadingDiv").fadeOut();
    declareFunctions();
    $("#endSessionNav").on('click', global.endSessionNav)
    $("#startSessionNav").on('click', global.startSessionNav)
    $("#getCode").on('click',global.getCode);
    $("#sendMessages").on('click',global.sendMessage)
    $("#sendMessagesNav").on('click',global.sendMessagesNav)
    $("#manageContactsNav").on('click',global.manageContactsNav)
    $("#manageResourcesNav").on('click',global.manageResourcesNav)
    $("#refreshMessages").on('click',global.refreshMsgsDt)
    $("#refreshContacts").on('click',global.refreshCntDt)
    $("#saveC").on('click',global.saveContacts);
    $("#selectAllExcel").on('click',function(){global.dtap.msgsDt.rows().nodes().to$().find('input[type="checkbox"]').prop('checked',true)})
    $("#selectNoneExcel").on('click',function(){global.dtap.msgsDt.rows().nodes().to$().find('input[type="checkbox"]').prop('checked',false)})
    $(".messageEditorModal button#modalSubmitModifyConatct").on('click',global.modalSubmitModifyConatct)
    $(".menubar .btn:not(#sessionStatus)").on('click',global.addActiveClass);
    $('#manageContactsDataTable').on('click', 'tbody tr', global.multipleSelectRowHandling);

    $('#contactNosRawData').on('input.propertychange', global.checkCharLength);
    $('#addMultipleContacts').on('click', global.addMultipleContacts);
    $('#copyMsgToAll').on('click', global.copyMsgToAll);
    $('#parseContactNosRawData').on('click', global.parseContactNosRawData);
    $('#modalSubmitAddContact').on('click', global.modalSubmitAddContact);

    $('#messageType').on('change', global.messageTypeChange);
    $('#uploadImage').on('change', global.uploadImageChange);

    $('.imageTypeDiv').on('click','.imgHolder .delImage', global.imgHolderDeleteImage);
    $('.imageTypeDiv').on('click','.imgHolder .addCaption', global.imgHolderAddCaption);
    $('#imgCaptionEditorSave').on('click', global.imgCaptionEditorSave);

    $('.messageEditorModal').on('show.bs.modal', function() {
        $("#contactName").val("");
        $("#contactNumber").val("");
        $("#messageType").val("text").change();
        global.imageData = {};
        setTimeout(function(){
           $("#contactName").focus();},500)
        global.quillMessage.setContents('')
        if(global.cRecord.isEdit){
            $(".imgCaptionEditorDiv").hide();
            global.editContact();
        }
    })
    $('.messageEditorModal').on('hidden.bs.modal', function() {
        global.cRecord.isEdit = global.cRecord.isAdd = false;
    })

    $('.messageEditorModal').on('keyup', function(event) {
        if(event.keyCode == 27){
            return global.confirmMessageModal()
        }
    });
    $('#modalCloseModifyConatct').on('click', function(event) {
        return global.confirmMessageModal()
    });

/*##############LISTENERS######################*/
function declareFunctions(){

    $( document ).ajaxStart(function() {
        $(".progress").css('visibility','');
    }).ajaxComplete(function(){
        $(".progress").css('visibility','hidden');
    });

    global.confirmMessageModal = function(event){
        if(!confirm('Are you sure?')) return false;
             $('.messageEditorModal').modal('hide');
    }

    global.checkCharLength = function(event){
        $(".charLength").text($(this).val().replace(/\n/g,'').length)
    }

    global.addActiveClass = function(){
        $(".btn").removeClass("buttonActive");
        $(this).toggleClass("buttonActive");
    }
    global.sendMessagesNav = function(){
        $(".sendMessagesPanel").show();
        $(".manageContactPanel").hide();
        $(".manageResourcesPanel").hide();
    }

    global.manageContactsNav = function(){
        $(".manageContactPanel").show();
        $(".sendMessagesPanel").hide();
        $(".manageResourcesPanel").hide();
        global.getContactData(function(data){
            if($(".manageContactPanel").is(':visible') && !global.dtap.cntDt)
                global.initContactsTable(data);
        })
    }

    global.manageResourcesNav = function(){
        $(".manageResourcesPanel").show();
        $(".manageContactPanel").hide();
        $(".sendMessagesPanel").hide();
        
    }

    global.endSessionNav = function(){
      $.ajax({
         url : `${global.apiurl}logout`,
         async : true,
         dataType : 'json',
         complete : function(jqXHR, status){
            if(status == "success"){
               $('#startSessionNav').prop('disabled',false);
               $('#startSessionNav').text('Start');
               $('#endSessionNav').prop('disabled',true);
               $("#sendMessagesNav").prop('disabled',true);
               $(".mypanel").hide()
               $.notify(jqXHR.responseJSON.msg,'success')
            }else if(status == "error"){

               $.notify(JSON.stringify(jqXHR.responseJSON),'error')
            }
         }
         })
    }

    global.startSessionNav = function(){
        $(".mypanel").hide();
        $("#startSessionNav").text("Please wait...");
        $("#startSessionNav").prop('disabled',true);
        $("#manageContactsNav").prop('disabled',true);
        setTimeout(function(){
            $(".qrCodeBoxPanel").show();
            $(".wtsapLoader").show();
            $(".clickConnect").text('Connecting...');
            // $(".progress-bar").removeClass('bg-success bg-danger').addClass('bg-primary');
            // $(".progress").css('visibility','');

            $.ajax({
                url : `${global.apiurl}start`,
                async : true,
                dataType : 'json',
                complete : function(jqXHR, status){
                    if(status == "success"){
                        $(".clickConnect").text('Getting qr..');
                        global.getCode(false,false);
                        // $(".progress-bar").toggleClass('bg-primary bg-success');
                        setTimeout(function(){
                            // $(".progress").css('visibility','hidden');
                            global.checkIsLoggedIn()
                        },2000)
                        $.notify(jqXHR.responseJSON.msg,'success')
                    }else if(status == "error"){
                        $(".clickConnect").text('Connection failed...');
                        // $(".progress-bar").toggleClass('bg-primary bg-danger');
                        setTimeout(function(){
                            $(".mypanel").hide();
                            $(".qrCodeBoxPanel").hide();
                            // $(".progress").css('visibility','hidden');
                            $("#startSessionNav").prop('disabled',false);
                            $("#manageContactsNav").prop('disabled',false);
                            $("#startSessionNav").text("Start");
                         },2000)
                        $.notify(JSON.stringify(jqXHR.responseJSON),'error')
                    }
                }
            })
       },0)
    }

    global.getCode = function(event,ifRefreh){
        $("#getCode").prop('disabled',true);
        // $(".progress").css('visibility','');
        // $(".progress-bar").removeClass('bg-success bg-danger bg-primary');
        // $(".progress-bar").addClass('bg-primary');
        $.ajax({
            url : `${global.apiurl}getcode/${_.isUndefined(ifRefreh) ? true : false}`,
            async : true,
            dataType : 'json',
            complete : function(jqXHR, status){
                if(status == "success"){
                    $(".clickConnect").hide();
                    $(".wtsapLoader").hide();
                    var qrCode = jqXHR.responseJSON.msg;
                    $("#codeImage").css('display','block')
                    $("#codeImage").prop('src',`${qrCode}`)
                    $("#getCode").prop('disabled',false);
                    $("._1jjYO").css('display','block') //whatsapp logo inside code
               }else if(status == "error"){
                    // $(".progress-bar").removeClass('bg-primary bg-success bg-danger');
                    // $(".progress-bar").addClass('bg-danger');
                    // $(".progress").css('visibility','');
                    setTimeout(function(){
                        $(".clickConnect").text('Getting qr failed...');
                        $("#getCode").prop('disabled',false);
                        // $(".progress").css('visibility','hidden');
                    },2000)
                    $.notify(`${JSON.stringify(jqXHR.responseJSON)}`,'error')
                }
            }
       })
    }

    global.sendMessage = function(){
        currentMsgRow = 0;
        var cData = global.getSelectedRowsData()[currentMsgRow];currentMsgRow++;
        if(!_.isUndefined(cData)){
            global.postMessage(cData)
        }else{
            $("#sendMessages").prop('disabled',false);
            $("#refreshMessages").prop('disabled',false);
        }
    }

    global.modalSubmitModifyConatct =function(){
      var cName = $("#contactName").val().trim();
      var cNumber = $("#contactNumber").val().trim();
      if(cNumber.match(/^[6-9]\d{9}$/g) != null){
          if(cName == "") cName = "__BLANK__";
          if($('#messageType').val() == 'image'){
              var contactData = _.clone(global.contactObject);
              contactData['contactName'] = cName;
              contactData['contactNumber'] = cNumber;
              contactData['stepNo'] = global.editRecordData.stepNo;
              contactData['type'] = global.editRecordData.type;
              contactData['id'] = global.editRecordData.id;
              contactData['data'] = global.editRecordData.data;
          }else{
              var msg = global.parseMessage(global.quillMessage);
              var contactData = _.clone(global.contactObject);
              contactData['contactName'] = cName;
              contactData['contactNumber'] = cNumber;
              contactData['data'][0]['text'] = msg.text;
              contactData['data'][0]['delta'] = msg.delta;

          }
          global.addChangeContact(global.dtap.cntDt,contactData)
          $('.messageEditorModal').modal('toggle')
      }else{
        $.notify('Please enter contact number correctly.','error')
      }
    }

    global.addChangeContact = function(dtap,newData){
        var rowno;
        var rowcount = dtap.data().length;
        var $row = $(".highlightContact");
        var current_row = parseInt($row.find('td:nth-child(1)').text());
        if(global.cRecord.isEdit){
            var data = global.dtap.cntDt.row(current_row-1).data()
            data['contactName'] = newData['contactName'];
            data['contactNumber'] = newData['contactNumber'];
            data['stepNo'] = newData['stepNo'];
            data['type'] = newData['type'];
            data['id'] = newData['id'];
            if(data['type'] == 'image'){
                data['data'] = newData['data'];
            }else{
                data['data'][0]['text'] = newData['data'][0]['text'];
                data['data'][0]['delta'] = newData['data'][0]['delta'];
            }

            global.dtap.cntDt.row(current_row-1).data(data)
            global.updateRowNo(dtap)
        }
        if(global.cRecord.isAdd){
            if(global.cRecord.seq == 0) rowno = rowcount+1;
            else if(global.cRecord.seq == -1) rowno = current_row-1;
            else if(global.cRecord.seq == 1) rowno = current_row;
            dtap.row.add(newData);
        }
        if(!_.isUndefined(rowno)){
            if(global.cRecord.seq != 0){
                var insertedRow = dtap.row(rowcount).data();
                for(var rw = rowcount; rw > rowno; rw--){
                    var tempRowData = $.extend(true, {}, dtap.row(rw-1).data());
                    dtap.row(rw).data(tempRowData);
                    dtap.row(rw-1).data(insertedRow);
                }
            }

            global.updateRowNo(dtap);
        }
    }

    global.editContact = function(){
        var $row = $(".highlightContact");
        var row = parseInt($row.find('td:nth-child(1)').text());
        var data = global.editRecordData = _.findWhere(global.dtob.cntDt.fnGetData(),{'stepNo':row});
        $("#contactName").val(data['contactName']);
        $("#contactNumber").val(data['contactNumber']);
        $("#messageType").val(data['type']);
        if(data['type'] == 'image'){
            $('.grid').contents(':not(.imgHolderPlus)').remove();
            $.each(data['data'], function(key,val){
                $(".textTypeDiv").hide();
                $(".imageTypeDiv").show();
                var fileName = val['fName']
                $(".grid").prepend(`
                    <div class="imgHolder" data-msg='${val['text']}' data-delta='${val['delta']}'>
                        <img title="${fileName}" alt="${fileName}" src="${val['url']}"/>
                        <div class='imageTitle' title='${fileName}'>${fileName}</div>
                        <div class="imgOptions">
                            <a href="#" class="showImage">View</a>
                            <a href="#" class="addCaption">Caption</a>
                            <a href="#" class="delImage">Delete</a>
                        </div>
                    </div>`)
            });
        }else if(data['type'] == 'text'){
            global.quillMessage.setContents(JSON.parse(data['data'][0]['delta']))
        }
    }

    global.deleteContact = function(dtap,dtob){
        var $row = $(".highlightContact");
        var current_row = parseInt($row.find('td:nth-child(1)').text());
        dtob.fnDeleteRow(current_row-1);
        global.updateRowNo(dtap);
    }

    global.deleteSelectedContact = function(dtap,dtob){
        global.dtap.cntDt.rows('.highlightContact').remove();
        global.updateRowNo(dtap);
    }

    global.copyMessage = function(dtap,dtob){
        var $row = $(".highlightContact");
        var current_row = parseInt($row.find('td:nth-child(1)').text());
        var data = dtob.fnGetData(current_row - 1);
        global.copyMessageData['m_Message'] = data['m_Message'];
        global.copyMessageData['m_Delta'] = data['m_Delta'];
    }

    global.pasteMessage = function(dtap,dtob){
        var $row = $(".highlightContact");
        var current_row = parseInt($row.find('td:nth-child(1)').text());
        global.dtap.cntDt.row().cell(current_row-1,4).data(global.copyMessageData['m_Message']);
        global.dtap.cntDt.row(current_row-1).data()['m_Delta'] = global.copyMessageData['m_Delta'];
    }

    global.pasteMessageToSelectedContact = function(){
        $.each($(".highlightContact td:nth-child(1)"), function(k,v){
            var current_row = parseInt($(v).text());
            global.dtap.cntDt.row().cell(current_row-1,4).data(global.copyMessageData['m_Message']);
            global.dtap.cntDt.row(current_row-1).data()['m_Delta'] = global.copyMessageData['m_Delta'];
        })
    }

    global.saveContacts = function(){
        $.ajax({
          type: "PUT",
          "async" : false,
          url: `${global.apiurl}updatecontacts`,
          data: JSON.stringify(global.dtob.cntDt.fnGetData()),
          complete : function(jqXHR, textStatus){
            if(textStatus == "success"){
                global.refreshCntDt();
                $.notify(JSON.stringify(jqXHR.responseJSON),'success')
            }   
            else if(textStatus == "error"){
                $.notify(jqXHR.responseText,'error')
            }
        },
          contentType: 'application/json; charset=utf-8',
        });
    }

    global.getContactData = function(cb){
        $.ajax({
            url : `${global.apiurl}getc`,
            async : true,
            dataType : 'json',
            complete : function(jqXHR, status){
                if(status == "success"){
                    cb(jqXHR.responseJSON);

                }else if(status == "error"){
                    $.notify(jqXHR.responseText,'error')
                    cb([])
                }
            }
        })
    }

    global.refreshMsgsDt = function(){
        global.getContactData(function(data){
            if(global.dtap.msgsDt){
                global.dtap.msgsDt.clear().draw()
                global.dtap.msgsDt.rows.add(data);
                global.dtap.msgsDt.draw()
            }
        })
    }
    global.refreshCntDt = function(){
        global.getContactData(function(data){
            if(global.dtap.cntDt){
                global.dtap.cntDt.clear().draw()
                global.dtap.cntDt.rows.add(data);
                global.dtap.cntDt.draw()
            }
        })
    }
    global.multipleSelectRowHandling = function(event) {
     var $destination = $(event.target);
     var $tr = $destination.closest('tr');
     var $td = $destination.closest('td');
     var $tbody = $tr.closest('tbody');
     var col = $tr.children().index($destination);
      var row = $tbody.children().index($tr);

      if($destination.closest('table')[0]){
          var $row = $(event.target);
            if($row[0].tagName !== "TR") $row = $row.closest('tr');

            if(event.ctrlKey === false) {
                $row.siblings().removeClass("highlightContact");
                $row.addClass("highlightContact");
            }else if(event.ctrlKey && !event.shiftKey){

              $row.toggleClass("highlightContact");
              var multiSelectionRowNo = row;

            }else if(event.ctrlKey && event.shiftKey){
              if(multiSelectionRowNo != -1){
                 var start = multiSelectionRowNo;
                 var end = row;
                 var x;
                 for(start<end ? x=start : x = end; start<end ? x<=end : x<=start ; x++){
                    if(x==start && $(global.dtap.cntDt.rows(x).nodes()[0]).hasClass('highlightContact'))
                    $(global.dtap.cntDt.rows(x).nodes()[0]).toggleClass('highlightContact');
                    $(global.dtap.cntDt.rows(x).nodes()[0]).toggleClass('highlightContact');
                 }
              }
            }
            multiSelectionRowNo = row;
      }
    $("span.rowsSelected span").text($(".highlightContact").length)
   }

   global.copyMsgToAll = function(event){
    var $row = $(".highlightContact");
    if($row.length == 1){
        var current_row = parseInt($row.find('td:nth-child(1)').text())-1;
        var data = global.dtap.cntDt.row(current_row).data();
        var m_Delta = data['m_Delta'];
        var m_Message = data['m_Message'];

        $.each(global.dtob.cntDt.fnGetData(), function(k,v){
            global.dtap.cntDt.row().cell(k,4).data(m_Message)
            global.dtap.cntDt.row(k).data()['m_Delta'] = m_Delta;
        })
        global.updateRowNo(global.dtap.cntDt);
    }else{
        $.notify('Select single message','error');
    }
   }


   global.addMultipleContacts = function(event){
    $(".addContactMultipleModal").modal('toggle')
   }

   global.verifyNumber = function(cNo){
    if(cNo.length != 10 || !/^\d+$/.test(cNo))
        return false;
    return true;
   }

   global.parseContactNosRawData = function(){
    var validInput = true;
    var rawInput = $("#contactNosRawData").val().trim();
    var structuredInput = rawInput.match(/.{1,10}/g)
    $.each(structuredInput, function(k,v){
        v = v.trim();
        if(!global.verifyNumber(v))
            validInput = false;
    })
    if(validInput && rawInput!= ""){
        $("#contactNosRawData").val(structuredInput.join("\n"))
    }else{
        $.notify('Not valid numbers','error')
        return false
    }
    return true;
   }

   global.modalSubmitAddContact = function(){
    if(global.parseContactNosRawData()){
        $(".addContactMultipleModal").modal('toggle')
        $.each($("#contactNosRawData").val().split("\n"), function(k,v){
            var contactData = _.clone(global.contactObject);
            contactData['contactNumber'] = v;
            global.dtap.cntDt.row.add(contactData)
        })
        global.updateRowNo(global.dtap.cntDt)
    }
   }

   global.messageTypeChange = function(event){
    $(".msgTypeDiv").hide();
    if(this.value == 'text'){
        $(".textTypeDiv").show();
    }   
    if(this.value == 'image'){
        $('.grid').contents(':not(.imgHolderPlus)').remove();
        $(".imageTypeDiv").show();
    }
    if(this.value == 'audio'){
    }
    if(this.value == 'video'){
    }
    if(this.value == 'document'){
    }
   }

   function readURL(input) {
        if (input.files && input.files[0]) {
            if(_.isUndefined(_.findWhere(global.editRecordData.data,{fName : input.files[0].name}))){
                    var reader = new FileReader();

                    reader.onload = function (e) {
                        var fileName = input.files[0].name;
                        $(".grid").prepend(`
                            <div class="imgHolder" data-msg='' data-delta=''>
                                <img title="${fileName}" alt="${fileName}" src="${e.target.result}"/>
                                <div class='imageTitle' title='${fileName}'>${fileName}</div>
                                <div class="imgOptions">
                                    <a href="#" class="showImage">View</a>
                                    <a href="#" class="addCaption">Caption</a>
                                    <a href="#" class="delImage">Delete</a>
                                </div>
                            </div>`)
                        global.editRecordData.data.push({text:'',delta:'',fName:fileName,url:'http://localhost:4001/api/serve/'+fileName})
                    }

                    reader.readAsDataURL(input.files[0]);
            }else{
                $.notify('file exists with same name')
            }
        }
    }
   global.uploadImageChange = function(event){
    readURL(this);
    
   }
   global.imgHolderDeleteImage = function(event){
    $(this.closest('.imgHolder')).remove()
   }

   global.imgHolderAddCaption = function(event){
    $('div.imgHolder').removeClass('highlightEditImage');
    $(this).closest('div.imgHolder').addClass('highlightEditImage');
    $(".imgCaptionEditorDiv").show();

    $.each(global.editRecordData['data'], function(k,v){
        var fileName = v['fName'];
        if(fileName == $(event.target).closest('.imgHolder').find('div.imageTitle').text())
            global.imgCaptionMessage.setContents(JSON.parse(v['delta']));
    })
   }

   global.imgCaptionEditorSave = function(event){
    $(".imgCaptionEditorDiv").hide();
    var msg = global.parseMessage(global.imgCaptionMessage);
    var fileName = $('div.highlightEditImage div.imageTitle').text();
    $.each(global.editRecordData.data, function(k,v){
        if(v['fName'] == fileName){
            v['delta'] = msg.delta;
            v['text'] = msg.text;
        }
    })
   }

}

/*##############HELPERS######################*/

String.prototype.replaceAt=function(index, replace) {
    return this.substring(0, index) + replace + this.substring(index + 1);
}

global.updateRowNo = function(dtap){
    for(var x = 0; x < dtap.data().length; x++){
        dtap.cell(x,0).data(x+1);
    }
    dtap.draw();
    if(!_.isUndefined($('tr.highlightContact')[0])){
        $('tr.highlightContact')[0].scrollIntoView();
        $(".dataTables_scrollBody")[0].scrollTop-=200;
    }

}


global.checkIsLoggedIn = function(){
    if(!isLoggedIn){
        $.ajax({
            url : `${global.apiurl}isloggedin`,
            async : true,
            dataType : 'json',
            complete : function(jqXHR, status){
                if(status == "success"){
                    setTimeout(function(){
                        isLoggedIn = true;
                        $(".mypanel").hide();
                        $(".clickConnect").text(jqXHR.responseJSON.msg)
                        $(".sendMessagesPanel").show();
                        $(".qrCodeBoxPanel").hide();
                        $("#startSessionNav").text('Connected');
                        $("#sendMessagesNav").prop('disabled',false);
                        $("#endSessionNav").prop('disabled',false);
                        $("#manageContactsNav").prop('disabled',false);
                        setTimeout(global.getContactData(function(data){
                            if($(".sendMessagesPanel").is(':visible') && !global.dtap.msgsDt){
                                global.initMessagesTable(data);
                            }
                        }),2000)
                        $.notify(JSON.stringify(jqXHR.responseJSON),'success')
                    },3000)
                }else if(status == "error"){
                    if(jqXHR.status == 400 && !_.isUndefined(jqXHR.responseText) && jqXHR.responseText.search('timeout') != -1)
                        global.checkIsLoggedIn();
                    else{
                        $("#startSessionNav").prop('disabled',false);
                        $("#startSessionNav").text('Start');
                        $("#manageContactsNav").prop('disabled',false);
                    }
                }
            }
        })
    }else{
        clearInterval(isLI);	
    }
}

global.getSelectedRowsData = function(){
    return $(global.dtap.msgsDt.$('input:checked').map(function(){
        return _.findWhere(global.dtob.msgsDt.fnGetData(),{'stepNo' : parseInt($(this).closest('tr').find('td:nth-child(1)').text())})
        return  global.dtob.msgsDt.fnGetData(parseInt($(this).closest('tr').find('td:nth-child(1)').text())-1)
    }))
}
global.postMessage = function(data){
    $("#sendMessages").prop('disabled',true);
    $("#refreshMessages").prop('disabled',true);
    var rowno = data['stepNo']-1;
    var maxrowno = global.dtob.msgsDt.fnGetData().length
    global.dtap.msgsDt.cell(rowno,6).data(global.msg_s_i);

    $.ajax({
        url : `${global.apiurl}sendmessage`,
        async : true,
        type : "POST",
        data : JSON.stringify(data),
        complete : function(jqXHR, status){
            if(status == "success"){
                global.dtap.msgsDt.cell(rowno,6).data(global.msg_s_s);
                var cData = global.getSelectedRowsData()[currentMsgRow];currentMsgRow++;
                if(!_.isUndefined(cData)){
                    setTimeout(function(){
                        global.postMessage(cData)
                    },2000)
                }else{$("#sendMessages").prop('disabled',false);$("#refreshMessages").prop('disabled',false);}
                $.notify(jqXHR.responseJSON.msg,'success')
            }else if(status == "error"){
                if(jqXHR.status == 500){
                    var cData = global.getSelectedRowsData();
                    $.map(cData, function(v){
                        global.dtap.msgsDt.cell(v['stepNo']-1,6).data(global.msg_s_f);
                    }) 
                    currentMsgRow = 0;
                   $("#sendMessages").prop('disabled',false);
                   $("#refreshMessages").prop('disabled',false);
                    $.notify(jqXHR.responseJSON,'error')
                }else{
                    global.dtap.msgsDt.cell(rowno,6).data(global.msg_s_f);
                    var cData = global.getSelectedRowsData()[currentMsgRow];currentMsgRow++;
                    if(!_.isUndefined(cData)){
                        setTimeout(function(){
                            global.postMessage(cData)
                        },2000)
                        $.notify(jqXHR.responseJSON,'error')
                    }else{
                        $("#sendMessages").prop('disabled',false);
                        $("#refreshMessages").prop('disabled',false);
                    }
                }
            }
        },
        dataType: 'json',
        contentType: 'application/json; charset=utf-8'
    })
}

global.initMessagesTable = function(json){
    $("#sendMessages").removeClass('d-none');
    $("#refreshMessages").removeClass('d-none');
    $("#sendMessages").prop('disabled',false);
    $("#refreshMessages").prop('disabled',false);
    $("#selectAllExcel").removeClass('d-none');
    $("#selectNoneExcel").removeClass('d-none');
    var clmns = _.keys(json[0]);clmns.splice(-1);
    global.dtap.msgsDt =  $("#sendMessagesDataTable").DataTable({
        data : json,
        columns : _.map(clmns, function(v){return( {data : v,title : v.split('_')[1]})}),
        columnDefs: [{"className": "dt-center", "targets": [0,1,6]},{"type" : 'html',
            render: $.fn.dataTable.render.ellipsis(190,true,false),
        'targets' : 4}],
        bInfo : false,
        pagination : false,
        bPaginate : false,
        stateSave: true,
        scrollY : "450px",
        scroller: true
    });
    global.dtob.msgsDt = $("#sendMessagesDataTable").dataTable()
    global.dtap.msgsDt.columns.adjust().draw();
}

global.initContactsTable = function(json){
    // var clmns = _.keys(json[0]);
    // clmns.splice(_.indexOf(clmns,'type'),1);
    // clmns.splice(_.indexOf(clmns,'m_Delta'),1);
    // clmns.splice(_.indexOf(clmns,'c_Status'),1);
    global.dtap.cntDt =  $("#manageContactsDataTable").DataTable({
        data : json,
        columns: [
            { "data": "stepNo"},
            { "data": "stepCheckBox" },
            { "data": "contactName" },
            { "data": "contactNumber" },
            { "data": "text"}
        ],
        // columns : _.map(clmns, function(v){return( {data : v,title : v.split('_')[1]})}),
        columnDefs: [
        {"className": "dt-center", "targets": [0,1]},
        {"type" : 'html', render: $.fn.dataTable.render.ellipsis(190,true,false),'targets' : 4}],
        bInfo : false,
        pagination : false,
        bPaginate : false,
        stateSave: true,
        scrollY : "450px",
        scroller: true,
        rowCallback: function( row, data ) {
            if(data.type == 'image'){
                $(row).find('td:nth-child(5)').empty();
                $.each(data.data, function(k,v){
                    $(row).find('td:nth-child(5)').append('<img src="'+v.url+'"/>')
                })
            }
        }
    });
    global.dtob.cntDt = $("#manageContactsDataTable").dataTable()
    global.dtap.cntDt.columns.adjust().draw();
}

var toolbarOptions = [[{ 'font': ['serif','monospace'] }],['bold', 'italic', 'strike']];
global.quillMessage = new Quill('#messageEditor', {
    theme: 'snow',
    formats: ['bold', 'italic', 'strike', 'font'],
    modules: {
        toolbar: toolbarOptions
    },
    placeholder : 'Enter your message...'
});
global.imgCaptionMessage = new Quill('#imgCaptionEditor', {
    theme: 'snow',
    formats: ['bold', 'italic', 'strike', 'font'],
    modules: {
        toolbar: toolbarOptions
    },
    placeholder : 'Enter your message...'
});

delete global.quillMessage.getModule('keyboard').bindings["9"]
delete global.imgCaptionMessage.getModule('keyboard').bindings["9"]

global.parseMessage = function(quillObj){
  var data = quillObj.getContents().ops;
  var finalText = ""
  _.map(data, function(v){
       var txt = v.insert;
       if(!_.isEmpty(_.pick(v.attributes,'bold'))){
           var spaceAtStart = txt.search(/\S|$/);temp=txt.split("").reverse().join("");
           var spaceAtSEnd = temp.search(/\S|$/) == 0? 1 : temp.search(/\S|$/);
           txt=txt.trim();
           if(txt!=""){
               txt = txt.replaceAt(-1,`*`).replaceAt(txt.length+1,`*`)
               if(spaceAtStart>0) txt=new Array(spaceAtStart + 1).join(' ') + txt;
           }
           if(spaceAtSEnd>0) txt=txt + new Array(spaceAtSEnd + 1).join(' ');
       }
       if(!_.isEmpty(_.pick(v.attributes,'italic'))){
           var spaceAtStart = txt.search(/\S|$/);temp=txt.split("").reverse().join("");
           var spaceAtSEnd = temp.search(/\S|$/);
           txt=txt.trim();
           if(txt!=""){
               txt = txt.replaceAt(-1,`_`).replaceAt(txt.length+1,`_`)
               if(spaceAtStart>0) txt=new Array(spaceAtStart + 1).join(' ') + txt;
           }
           if(spaceAtSEnd>0) txt=txt + new Array(spaceAtSEnd + 1).join(' ');
       }
       if(!_.isEmpty(_.pick(v.attributes,'strike'))){
           var spaceAtStart = txt.search(/\S|$/);temp=txt.split("").reverse().join("");
           var spaceAtSEnd = temp.search(/\S|$/);
           txt=txt.trim();
           if(txt!=""){
               txt = txt.replaceAt(-1,`~`).replaceAt(txt.length+1,`~`)
               if(spaceAtStart>0) txt=new Array(spaceAtStart + 1).join(' ') + txt;
           }
           if(spaceAtSEnd>=0) txt=txt + new Array(spaceAtSEnd + 1).join(' ');
       }
       if(!_.isEmpty(_.pick(v.attributes,'font'))){
           if(v.attributes.font=='monospace'){
               var spaceAtStart = txt.search(/\S|$/);temp=txt.split("").reverse().join("");
               var spaceAtSEnd = temp.search(/\S|$/);
               txt=txt.trim();
               if(txt!=""){
                   txt = txt.replaceAt(-1,"```" ).replaceAt(txt.length+3,"```")
                   if(spaceAtStart>0) txt=new Array(spaceAtStart + 1).join(' ') + txt;
               }
               if(spaceAtSEnd>0) txt=txt + new Array(spaceAtSEnd + 1).join(' ');
           }
       }
       finalText += txt;
  })
  finalText = finalText.replace(/(?=(?:[^*]*\*[^*]*\*)*[^*]*$)\*/g, "<b>").replace(/\*/g,"</b>").
  replace(/(?=(?:[^~]*~[^~]*~)*[^~]*$)~/g, "<strike>").replace(/~/g,"</strike>").
  replace(/(?=(?:[^_]*_[^_]*_)*[^_]*$)_/g, "<i>").replace(/_/g,"</i>").
  replace(/(?=(?:[^```]*```[^```]*```)*[^```]*$)```/g, "<tt>").replace(/```/g,"</tt>");
  return {text:finalText,delta:JSON.stringify(data)};
}

$.contextMenu({
    selector: '#manageContactsDataTable', 
    zIndex : 2,
    reposition : false,
    animation: {duration: 250, show: 'fadeIn', hide: 'fadeOut'},
    build: function($trigger, e) {
        var $destination = $(e.target);
        var $tr = $destination.closest('tr');
        var $tbody = $tr.closest('tbody');
        var multMenu = false;
        var isCopied = false;
        if(!_.isEmpty(global.copyMessageData)){
            isCopied = true;
        }
        if($tbody.find('tr.highlightContact').length > 1){
           multMenu = true;
        }else{
           $tbody.find('tr').removeClass('highlightContact')
           $tr.addClass('highlightContact')
        }
        return {
            callback: function(key, options) {
                if(key == 'editContact'){
                    global.cRecord.isEdit = true;
                    $('.messageEditorModal').modal('toggle');
                }else if(key == 'addContact'){
                    global.cRecord.isAdd = true;
                    global.cRecord.seq = 0;
                    $('.messageEditorModal').modal('toggle');
                }else if(key == 'addContactAbove'){
                    global.cRecord.isAdd = true;
                    global.cRecord.seq = -1;
                    $('.messageEditorModal').modal('toggle');
                }else if(key == 'addContactBelow'){
                    global.cRecord.isAdd = true;
                    global.cRecord.seq = 1;
                    $('.messageEditorModal').modal('toggle');
                }else if(key == 'deleteContact'){
                    if(!confirm('Are you sure?')){$("#manageContactsDataTable").contextMenu("hide");return false}
                    global.deleteContact(global.dtap.cntDt,global.dtob.cntDt)
                }else if(key == 'deleteSelectedContact'){
                    if(!confirm('Are you sure?')){$("#manageContactsDataTable").contextMenu("hide");return false}
                    global.deleteSelectedContact(global.dtap.cntDt,global.dtob.cntDt);
                }else if(key == 'copyMessage'){
                    global.copyMessage(global.dtap.cntDt,global.dtob.cntDt);
                }else if(key == 'pasteMessage'){
                    if(!confirm('Are you sure?')){$("#manageContactsDataTable").contextMenu("hide");return false}
                    global.pasteMessage(global.dtap.cntDt,global.dtob.cntDt);
                }else if(key == 'pasteMessageToSelectedContact'){
                    if(!confirm('Are you sure?')){$("#manageContactsDataTable").contextMenu("hide");return false}
                    global.pasteMessageToSelectedContact(global.dtap.cntDt,global.dtob.cntDt);
                }
            },
            items: {
                "editContact": {name: "Edit contact", icon: "fas fa-edit",accesskey: "e", disabled : multMenu},
                "addContact": {name: "Add contact", icon: "fas fa-plus",accesskey: "a"},
                "addContactAbove": {name: "Add contact above", icon: "fas fa-angle-double-up",accesskey: "b", disabled : multMenu},
                "addContactBelow": {name: "Add contact below", icon: "fas fa-angle-double-down",accesskey: "l", disabled : multMenu},
                "sep1": "---------",
                "deleteContact": {name: "Delete contact", icon: "fas fa-trash",accesskey: "d", disabled : multMenu},
                "deleteSelectedContact": {name: "Delete Selected contacts", icon: "fas fa-trash",accesskey: "s", disabled : !multMenu},
                "sep2": "---------",
                "copyMessage": {name: "Copy message", icon: "fas fa-copy",accesskey: "m", disabled : multMenu},
                "pasteMessage": {name: "Paste message", icon: "fas fa-paste",accesskey: "p", disabled : multMenu || !isCopied},
                "pasteMessageToSelectedContact": {name: "Paste message to selected", icon: "fas fa-paste",accesskey: "t", disabled : !multMenu || !isCopied},
            }
        };
    },
    events: {
        show : function(options){
        },
        hide : function(options){
           // $("tr.highlightContact").removeClass('highlightContact')
        }
    }
});
$(".messageEditorModal").modal('toggle')



//qrWindow
// (function(){

//   $(".qrCodeBoxPanel").show();
// })()

//lastWindow
// (function(){
//   $("#startSessionNav").hide();
//   $(".qrCodeBoxPanel").hide();
//   $("#mangeContacts").hide();
//   $(".sendMessagesPanel").show();
// })()

}//load