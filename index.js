let fs = require('fs');
let Papa = require('papaparse');
let _ = require('lodash');
let phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
let PNF = require('google-libphonenumber').PhoneNumberFormat;
let file = 'input.csv';
// When the file is a local file when need to convert to a file Obj.
//  This step may not be necissary when uploading via UI
let content = fs.readFileSync(file, "utf8");
let dataset = Papa.parse(content);

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validateNumber(number) {
  let same = number;
  number = number.replace( /\D+/g, '');
  if(number.length > 1){
    number  = phoneUtil.parseAndKeepRawInput(number, 'BR');
    if (phoneUtil.isValidNumber(number)){
      return true
    };
  };
  return false
}

function formatNumber(number) {
  number = number.replace( /\D+/g, '');
  number  = phoneUtil.parseAndKeepRawInput(number, 'BR');
  number = phoneUtil.format(number, PNF.E164);
  return number
}

function doTags(dataset,adress,x,i,support){
  let tags = dataset.data[0][i].split(" ");
  for (let x = 0; x < tags.length; x++) {
    if(tags[x]=="phone" || tags[x]=="email" ){
      adress.type = tags[x];
    }
    else{
      adress.tags =_.compact(_.concat(
                            adress.tags,tags[x]));
    };
  };
  let validate = have_equal(support,adress);
  if(validate[0]){
    support = validate[1]
  }
  else{
    support.adresses =_.compact( _.concat(
        support.adresses,adress));
  };
  return support
}

function have_equal(support,adress) {
  if (typeof support.adresses != 'undefined'){
    for (i = 0; i < support.adresses.length; i++){
      if (support.adresses[i].adress == adress.adress){
        support.adresses[i].tags = _.compact(
          _.union(support.adresses[i].tags,adress.tags)
        )
        support.adresses[i].type = _.compact(
          _.union(support.adresses[i].type,[adress.type])
        )
        return [true,support]
      };
    };
  };
  return [false,support]
}

let output = {};
let support = {fullname:'',eid:'',classes:'',adresses:'',see_all:''};


// Filtrar linhas com mesmo nome
for (let w = 0; w < dataset.data[0].length; w++) {
  if (dataset.data[0][w] == "fullname") {
    for (let x = 1; x < dataset.data.length; x++) {
      for (let y = x+1; y < dataset.data.length; y++) {
        if(dataset.data[x][w] == dataset.data[y][w]){
          for (let z = 0; z < dataset.data[0].length; z++) {
            dataset.data[x][z] = _.union([dataset.data[x][z]],
                                    [dataset.data[y][z]]);
            dataset.data[x][z] = dataset.data[x][z].join(",");
          };
          dataset.data = _.compact(_.pull(dataset.data,dataset.data[y]));
        };
      };
    };
  };
};



for (let j = 1; j < dataset.data.length; j++) {
  if(dataset.data[j] != ''){
    for (let i = 0; i < dataset.data[0].length; i++) {
      if(dataset.data[0][i] == "fullname"){
        support.fullname = dataset.data[j][i];
      }
      else if (dataset.data[0][i] == "eid"){
        support.eid = dataset.data[j][i];
      }
      else if (dataset.data[0][i] == "class"){
        support.classes =_.compact(_.concat(
          dataset.data[j][i].split(/[\,\/]/),support.classes));
      }
      else if (dataset.data[0][i] == "invisible"){
        support.invisible = _.compact(_.union(
          dataset.data[j][i].split(",")));
        if(support.invisible == '1'){
          support.invisible = true
        }
        else{
          support.invisible = false
        };
      }
      else if (dataset.data[0][i] == "see_all"){
        support.see_all = _.compact(_.union(
          dataset.data[j][i].split(",")));
        if(support.see_all == 'yes'){
          support.see_all = true
        }
        else{
          support.see_all = false
        };
      }
      else{
        dataset.data[j][i] = _.compact(dataset.data[j][i].split(/[\,:/]/));
        for (let x = 0; x < dataset.data[j][i].length; x++) {
          let adress = {tags: '', adress:'',type:'' };
          if (validateEmail(dataset.data[j][i][x])){
            adress.adress = dataset.data[j][i][x];
            support = doTags(dataset,adress,x,i,support);
          }
          else if( validateNumber(dataset.data[j][i][x])){
            adress.adress =formatNumber(dataset.data[j][i][x]);
            support = doTags(dataset,adress,x,i,support)
          };
          };
        };
      };
      output = ( _.concat(_.compact(output), support));
      support = {fullname:'',eid:'',classes:'',adresses:'',see_all:''};
    };
};

console.log(output[0].adresses)
var dictstring = JSON.stringify(output);
fs.appendFile('output.json');
fs.writeFile("output.json", dictstring);
