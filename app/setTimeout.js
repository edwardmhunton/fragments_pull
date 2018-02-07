

function cats(name){

  console.log("regname "+name);

if(name !== 'james'){

  setTimeout(function(){

    console.log("log name"+name);

  }, 10000)


}

}

cats('john');
cats('james');
