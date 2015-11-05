(function(){
  'use strict'
  
  function decode(){
    var decodeFrom = document.getElementById( 'decodeFrom' )
    var decodeTo = document.getElementById( 'decodeTo' )
    
    var canvas = hrm.draw.Canvas( decodeFrom.value )
    
    decodeTo.innerHTML = canvas.toSvg()          
  }
  
  function generate(){
    var input = document.getElementById( 'input' )
    var image = document.getElementById( 'image' )
    var asm = document.getElementById( 'asm' )
    var preview = document.getElementById( 'preview' )
    
    var canvas = hrm.draw.Canvas()
    
    canvas.text( input.value )
    
    image.textContent = canvas.toImage()
    
    asm.textContent = canvas.toAsm()
    
    preview.innerHTML = canvas.toSvg()
  }   

  document.getElementById( 'generate' ).addEventListener( 'click', function( event ) {
    generate()
  }, false )
  
  document.getElementById( 'decode' ).addEventListener( 'click', function( event ) {
    decode()
  }, false )

  generate()
  decode()
})()