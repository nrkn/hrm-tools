(function(){
  'use strict'

  var levelData = ([
    {
      "number": 0,
      "name": "Sandbox",      
      "commands": [ "INBOX", "OUTBOX", "COPYFROM", "COPYTO", "ADD", "SUB", "BUMPUP", "BUMPDN", "JUMP", "JUMPZ", "JUMPN" ],
      "dereferencing": true,
      "comments": true,
      "labels": true,
      "floor": {
        "columns": 5,
        "rows": 5,
        "tiles": {
          "24": 0
        }
      },
      "examples": [
        {
          "inbox": [ 1, 9, 4 ],
          "outbox": [ 1, 9, 4 ]
        }
      ],
      "challenge": {
        "size": 1,
        "speed": 1
      }
    },
  ]).concat( hrm.levelData )
  
  var sandboxInbox = localStorage.getItem( 'Sandbox-inbox' )
  var sandboxFloor = localStorage.getItem( 'Sandbox-floor' )
  
  if( typeof sandboxInbox === 'string' && typeof sandboxFloor === 'string' ){
    sandboxInbox = JSON.parse( sandboxInbox )
    sandboxFloor = JSON.parse( sandboxFloor )
    
    levelData[ 0 ].examples[ 0 ].inbox = sandboxInbox
    levelData[ 0 ].floor.tiles = sandboxFloor
  }
  
  var codeEditor = document.querySelector( '#code textarea' )
  
  codeEditor.addEventListener( 'input', function(){
    var level = Level( view.level() )
    var saveName = level.name + '-source'
    
    localStorage.setItem( saveName, codeEditor.value )
  }, false )
  
  function loadLevelSource( level ){
    var saveName = level.name + '-source'
    
    return localStorage.getItem( saveName )    
  }
  
  var states = {
    notRunning: 0,
    started: 1,
    running: 2,
    ended: 4
  }
  
  var view = View( stop, back, run, step, stepSelect )  
  var cpu
  var steps
  var stepIndex
  var meta
  
  stop()
  
  function stop( event ){
    var level = Level( view.level() )
    var floor = Floor( level )
    var inbox = Inbox( level )
    
    var source = loadLevelSource( level )
    if( typeof source === 'string' ){
      codeEditor.value = source
    }    
    
    //if you don't do this, the UI won't always refresh after a try-catch!
    setTimeout( function(){
      view.reset()
      view.state( states.notRunning )
      view.inbox( inbox )
      view.floor( floor )      
      view.levelName( level )
    }, 0 )
    
    cpu = null
    steps = []
    stepIndex = 0
  }
  
  function back(){
    if( stepIndex > 0 ){
      stepIndex--
    } 
    
    displayStep( stepIndex )
  }
  
  function run(){
    if( !cpu ){
      init()
    }
    
    for( var i = stepIndex; i < steps.length; i++ ){
      step( true )
    }
    
    displayStep( stepIndex )
  }
  
  
  
  function init(){
    var level = Level( view.level() )
    var floor = Floor( level )
    var inbox = Inbox( level )
    var source = view.source()
    var program;
    
    hrm.parser( source, function( err, program, m ){
      if( err ){
        alert( err )
        stop()
        return
      }
      
      meta = m
      
      view.inbox( inbox )
      view.floor( floor )
      
      var cpuFloor = floor
      if( floor.tiles.length === 0 && floor.columns === 0 && floor.rows === 0 ){
        cpuFloor = {}
      }
      
      cpu = hrm.cpu( program, inbox, cpuFloor )
      
      steps.push( JSON.parse( JSON.stringify( cpu.state ) ) )
      
      var state 
      
      function next(){
        var succeeded
        
        try{
          state = cpu.step()
          succeeded = true
        } catch( e ){
          alert( e.message )
          succeeded = false
        } finally {
          return succeeded
        }
      }
      
      if( !next() ){
        stop()
        return
      }
      
      steps.push( JSON.parse( JSON.stringify( state ) ) )
      
      while( state.running ){
        if( !next() ){
          stop()
          return
        }
        
        steps.push( JSON.parse( JSON.stringify( state ) ) )      
      }
      
      view.steps( steps.length - 1 )
      stepIndex = 0
      
      displayStep( stepIndex )        
    })
  }
  
  function step( noDisplay ){
    if( !cpu ){
      init()     
      return
    }
    
    if( stepIndex + 1 < steps.length ){
      stepIndex++            
      if( noDisplay !== true )
        displayStep( stepIndex )
    }
  }
  
  function stepSelect(){
    stepIndex = view.step()
    displayStep( stepIndex )
  }  
  
  function displayStep( stepIndex ){
    var state = steps[ stepIndex ]    
    var level = Level( view.level() )
    var floor = Floor( level )
    
    view.levelName( level )
    view.step( stepIndex )
    view.inbox( state.inbox )
    view.floor( {
      tiles: state.memory,
      columns: floor.columns,
      rows: floor.rows
    })
    view.outbox( state.outbox )    
    view.hand( state.accumulator )
    view.program( state.program, state.counter )
    
    view.state( 
      stepIndex === 0 ? 
        states.started : 
        stepIndex === ( steps.length - 1 ) ? 
          states.ended : 
          states.running 
    )
  }
  
  function View( onStop, onBack, onRun, onStep, onStepSelect ){
    var dom = {
      inbox: document.querySelector( '#inbox > ul' ),
      outbox: document.querySelector( '#outbox > ul' ),
      floor: document.querySelector( '#floor' ),
      tiles: document.querySelector( '#floor #tiles' ),
      code: document.querySelector( '#code > textarea' ),
      program: document.querySelector( '#code > pre' ),
      level: document.getElementById( 'level' ),
      levelName: document.getElementById( 'levelName' ),
      run: document.getElementById( 'run' ),
      stop: document.getElementById( 'stop' ),
      back: document.getElementById( 'back' ),
      step: document.getElementById( 'step' ),
      stepControl: document.getElementById( 'stepSelect' ),
      stepSelectContainer: document.getElementById( 'stepSelectContainer' ),
      stepSelect: document.querySelector( '#stepSelect > input' ),
      stepsCaption: document.querySelector( '#stepSelect > span' ),
      hand: document.getElementById( 'hand' ),
      handValue: document.querySelector( '#hand > span' ),
      editSetup: document.getElementById( 'editSetup' ),
      saveSetup: document.getElementById( 'saveSetup' ),
      cancelSetup: document.getElementById( 'cancelSetup' ),
      editInbox: document.querySelector( '#editInbox > textarea' ),
      editFloor: document.querySelector( '#editFloor > textarea' ),
      main: document.querySelector( 'main' )
    }
    
    function init(){
      dom.level.addEventListener( 'change', onStop, false )
      dom.stop.addEventListener( 'click', onStop, false )
      dom.back.addEventListener( 'click', onBack, false )
      dom.run.addEventListener( 'click', onRun, false )
      dom.step.addEventListener( 'click', onStep, false )
      dom.stepSelect.addEventListener( 'change', onStepSelect, false )
      
      dom.editSetup.addEventListener( 'click', function(){
        editing = true
        dom.main.className = 'editing'
        
        var level = levelData[ 0 ]
        var inbox = Inbox( level )
        var floor = Floor( level ).tiles
        
        dom.editInbox.value = inbox.join( ', ' )
        
        var floorObj = {}
        
        floor.forEach( function( value, i ){
          floorObj[ i ] = value
        })
        
        dom.editFloor.value = JSON.stringify( floorObj, null, 2 )
        
        setState[ states.notRunning ]()
      }, false )      
      
      dom.cancelSetup.addEventListener( 'click', function(){
        editing = false
        dom.main.className = ''
        
        setState[ states.notRunning ]()
      }, false )      
      
      dom.saveSetup.addEventListener( 'click', function(){        
        var level = levelData[ 0 ]
        var floor = Floor( level )
        
        var inboxData = dom.editInbox.value.split( ',' )
          .map( function( item ){
            return item.trim().toUpperCase().replace( /"/g, '' )
          })
          .filter( function( item ){
            return item !== ''
          })
        
        function isValid( item ){
          return /^[A-Z]$/.test( item ) || /^\-?[0-9]{1,3}$/.test( item )
        }
        
        var floorValid = true
        var floorObj
        
        try{
          floorObj = JSON.parse( dom.editFloor.value )
        } catch( e ){
          floorValid = false
        } finally {
          if( floorValid ){
            floorValid = typeof floorObj === 'object'
          }

          if( floorValid ){
            var keys = Object.keys( floorObj ).map( function( key ){
              return Number( key )
            })
            
            floorValid = keys.every( function( key ){
              return typeof key === 'number' && key >= 0 && key <= 24
            })
          }
          
          if( floorValid ){
            floorValid = Object.keys( floorObj ).every( function( key ){
              return isValid( floorObj[ key ] )
            })
          }
          
          if( !floorValid ){
            alert( 'Invalid floor data! Expected a valid JSON object where the keys are 0-24 and the values are single upper case characters A-Z or numbers between -999 and 999' )
            
            return
          }
          
          if( inboxData.every( isValid ) ){          
            dom.main.className = ''
            editing = false
            setState[ states.notRunning ]()        
            
            inboxData = inboxData.map( function( value ){
              return /^\-?[0-9]{1,3}$/.test( value ) ? Number( value ) : value              
            })
            
            levelData[ 0 ].examples[ 0 ].inbox = inboxData
            levelData[ 0 ].floor.tiles = floorObj
            
            localStorage.setItem( 'Sandbox-inbox', JSON.stringify( inboxData ) )
            localStorage.setItem( 'Sandbox-floor', JSON.stringify( floorObj ) )
            
            setInbox( Inbox( levelData[ 0 ] ) )
            setFloor( Floor( levelData[ 0 ] ) )
          } else {
            alert( 'Invalid inbox data! Expected upper case characters A-Z or numbers between -999 and 999, seperated by commas' )          
          }             
        }        
      }, false )      
      
      initLevelSelect()
    }
    
    function initLevelSelect(){
      dom.level.innerHTML = ''
      
      levelData.forEach( function( level, i ){
        if( level.cutscene ) return;
        
        var option = document.createElement( 'option' )
        
        option.value = level.number
        option.text = level.number + '. ' + level.name
        option.selected = level.number === 0
        
        dom.level.add( option, null )
      })
    }  
    
    function getLevel(){
      return Number( dom.level[ dom.level.selectedIndex ].value )
    }  
    
    function reset(){
      dom.inbox.innerHTML = ''
      dom.outbox.innerHTML = ''
      dom.tiles.innerHTML = ''
    }  
    
    var editing = false
    var setState = {}
    
    setState[ states.notRunning ] = function(){
      dom.run.disabled = false
      dom.stop.disabled = true
      dom.back.disabled = true
      dom.step.disabled = false
      dom.level.disabled = false
      dom.code.disabled = false
      dom.code.hidden = false
      dom.program.hidden = true
      
      setHand( null )
      
      dom.stepSelectContainer.hidden = true
      dom.stepSelect.min = 0
      dom.stepSelect.max = 1
      dom.stepSelect.value = 0
      
      dom.editSetup.hidden = true
      dom.cancelSetup.hidden = true
      dom.saveSetup.hidden = true
      
      if( getLevel() === 0 ){
        if( editing ){
          dom.cancelSetup.hidden = false
          dom.saveSetup.hidden = false
        } else {
          dom.editSetup.hidden = false
        }
      }
    }
    
    setState[ states.started ] = function(){
      dom.run.disabled = false
      dom.stop.disabled = false
      dom.back.disabled = true
      dom.step.disabled = false
      dom.level.disabled = true
      dom.code.disabled = true
      dom.code.hidden = true
      dom.program.hidden = false
      
      dom.stepSelectContainer.hidden = false      
      dom.stepsCaption.textContent = dom.stepSelect.value + '/' + dom.stepSelect.max
      
      dom.editSetup.hidden = true
      dom.cancelSetup.hidden = true
      dom.saveSetup.hidden = true
    }
    
    setState[ states.running ] = function(){
      dom.run.disabled = false
      dom.stop.disabled = false
      dom.back.disabled = false
      dom.step.disabled = false
      dom.level.disabled = true
      dom.code.disabled = true
      dom.code.hidden = true
      dom.program.hidden = false
      
      dom.stepSelectContainer.hidden = false
      dom.stepsCaption.textContent = dom.stepSelect.value + '/' + dom.stepSelect.max
      
      dom.editSetup.hidden = true
      dom.cancelSetup.hidden = true
      dom.saveSetup.hidden = true    
    }    
    
    setState[ states.ended ] = function(){
      dom.run.disabled = true
      dom.stop.disabled = false
      dom.back.disabled = false
      dom.step.disabled = true
      dom.level.disabled = true
      dom.code.disabled = true
      dom.code.hidden = true
      dom.program.hidden = false      
      
      dom.stepSelectContainer.hidden = false
      dom.stepsCaption.textContent = dom.stepSelect.value + '/' + dom.stepSelect.max
      
      dom.editSetup.hidden = true
      dom.cancelSetup.hidden = true
      dom.saveSetup.hidden = true   
    }
    
    function setInbox( values ){
      dom.inbox.innerHTML = ''
      
      values.forEach( function( value ){
        var li = document.createElement( 'li' )
        
        li.textContent = value            
        li.className = 'tile ' + typeof value
        
        dom.inbox.appendChild( li )
      })
    }  
    
    function setOutbox( values ){
      dom.outbox.innerHTML = ''
      
      values.slice().reverse().forEach( function( value ){
        var li = document.createElement( 'li' )
        
        li.textContent = value
        li.className = 'tile ' + typeof value
        
        dom.outbox.appendChild( li )
      })
    }
    
    function setFloor( floor ){
      if( floor.rows === 0 || floor.columns === 0 ){
        dom.floor.className = 'hidden'
        return
      }
      
      dom.floor.className = ''
      dom.tiles.innerHTML = ''
      
      for( var y = 0; y < floor.rows; y++ ){
        var row = document.createElement( 'div' )
        
        row.className = 'floorRow'
        
        for( var x = 0; x < floor.columns; x++ ){
          var i = y * floor.columns + x
          
          var value = floor.tiles[ i ]
          
          var floorTile = document.createElement( 'div' )
          
          floorTile.className = 'floorTile'
          
          var tile = document.createElement( 'div' )
          tile.className = 'tile floor-' + i
            
          if( value === 0 || value ){
            tile.textContent = value            
            tile.className += ' ' + typeof value
          }
            
          floorTile.appendChild( tile )
          
          var span = document.createElement( 'span' )
          
          span.textContent = i

          floorTile.appendChild( span )
          
          if( meta ){
            var labelImageData = meta.images.labels[ i ]
            if( typeof labelImageData === 'string' ){
              var canvas = hrm.draw.Canvas( labelImageData )
              
              var labelImage = document.createElement( 'div' )
              labelImage.className = 'image'
              labelImage.innerHTML = canvas.toSvg()
              
              floorTile.appendChild( labelImage )
            }
          }
          
          row.appendChild( floorTile )              
        }
        
        dom.tiles.appendChild( row )
      }
    }  
    
    function setHand( value ){
      dom.handValue.innerHTML = ''
      
      var tile = document.createElement( 'div' )

      if( value === 0 || value ){
        tile.textContent = value
        tile.className = 'tile ' + typeof value
      } else {
        tile.innerHTML = '&nbsp;'
        tile.className = 'tile'
      }
      
      dom.handValue.appendChild( tile )
    }      
    
    function setProgram( program, lineNumber ){
      dom.program.innerHTML = ''
      
      program.forEach( function( line, i ){
        var before = document.createElement( 'div' )
        
        if( Array.isArray( meta.comments[ i ] ) ){
          meta.comments[ i ].forEach( function( c ){
            var comment = document.createElement( 'p' )          
            comment.className = 'comment'            
            comment.textContent = c

            before.appendChild( comment )
          })
        }
        
        if( Array.isArray( meta.images.comments[ i ] ) ){
          meta.images.comments[ i ].forEach( function( c ){            
            var canvas = hrm.draw.Canvas( c )
            
            var commentImage = document.createElement( 'div' )          
            commentImage.className = 'image'            
            commentImage.innerHTML = canvas.toSvg()

            before.appendChild( commentImage )            
          })          
        }
        
        var jumpLabels = Object.keys( meta.jumps ).filter( function( key ){
          var jump = meta.jumps[ key ]
          
          return jump.to === i
        })
        
        jumpLabels.forEach( function( key ){
          var target = document.createElement( 'div' )
          target.className = 'target target-' + key
          
          target.textContent = key + ':'
          
          before.appendChild( target )
        })
        
        var div = document.createElement( 'div' )
        
        var marker = '  '
        var className = 'line-' + i
        
        if( lineNumber === i ){
          marker = '> '
          className += ' current'          
        }
        
        div.className = className
        
        var currentLine = String( i + 1 )
        while( currentLine.length < 3 ){
          currentLine = ' ' + currentLine
        }
        currentLine += '  '
        
        var instr = line[ 0 ]
        while( instr.length < 10 ){
          instr += ' '
        }
       
        var ms = document.createElement( 'span' )
        ms.textContent = marker
        ms.className = 'marker'
        div.appendChild( ms )
        
        var ls = document.createElement( 'span' )
        ls.textContent = currentLine
        ls.className = 'lineNumber'
        div.appendChild( ls )
        
        var ins = document.createElement( 'span' )
        ins.textContent = instr
        ins.className = 'instr'
        div.appendChild( ins )
        
        if( line.length > 1 ){
          var jumps = [ 'JUMP', 'JUMPZ', 'JUMPN' ]
          var isJump = jumps.includes( line[ 0 ] )   

          var tileIndex = line[ 1 ]
          var reference = false
          
          if( typeof tileIndex === 'string' ){
            tileIndex = parseInt( tileIndex.substr( 1 ) )
            reference = true
          }
          
          var label = meta.images.labels[ tileIndex ]

          var ars = document.createElement( 'span' )
          ars.className = 'arg'
          
          if( typeof label === 'string' && !isJump ){
            var canvas = hrm.draw.Canvas( label )
            
            var svg = canvas.toSvg()
            
            if( reference ){
              svg = '[' + svg + ']'
            }
            
            ars.innerHTML = svg
          } else {
            var arg

            if( isJump ){
              arg = Object.keys( meta.jumps ).find( function( j ){
                var jump = meta.jumps[ j ]
                return jump.from === i
              })
            } else {
              arg = String( line[ 1 ] )
            }
            
            ars.textContent = arg
          }
          
          div.appendChild( ars )                      
        } 

        dom.program.appendChild( before )
        dom.program.appendChild( div )
      })
      
      //if there are jumps below the last line
      var extraJumps = Object.keys( meta.jumps ).filter( function( key ){
        var jump = meta.jumps[ key ]
        
        return jump.to >= program.length
      })
      
      extraJumps.forEach( function( key ){
        var jump = meta.jumps[ key ]
        
        var target = document.createElement( 'div' )
        target.className = 'target target-' + key + ' line-' + jump.to
        
        target.textContent = key + ':'

        dom.program.appendChild( target )
      })
      
      //if not in view
      
      var targetIndex = lineNumber === 0 ? lineNumber : lineNumber - 1
      var target = document.querySelector( '.line-' + targetIndex )
      
      if( target && target.scrollIntoView )
        target.scrollIntoView()
      
      highlight( program, lineNumber )
    }
    
    var tileToHand = function( lineNumber, arg ){
      var i
      var fromEl
      
      if( typeof arg === 'number' ){
        i = arg
      } else {
        i = parseInt( arg.substr( 1 ) )
        fromEl = dom.floor.querySelector( '.floor-' + i )
        fromEl.className += ' from-reference'
        i = Number( fromEl.textContent )
      }
      
      fromEl = dom.floor.querySelector( '.floor-' + i )
      var toEl = dom.hand.querySelector( '.tile' )
      
      fromEl.className += ' from'
      toEl.className += ' to'            
    }
    
    var jump = function( lineNumber, arg ){
      var key = Object.keys( meta.jumps ).find( function( j ){
        var jump = meta.jumps[ j ]
        return jump.from === lineNumber
      })      
      var target = document.querySelector( '.target-' + key )
      target.className += ' current-target'
    }
    
    var highlighters = {
      'INBOX': function( lineNumber, arg ){
        var fromEl = dom.inbox.querySelector( 'li:first-child' )
        var toEl = dom.hand.querySelector( '.tile' )
        
        if( !fromEl ) return
        
        fromEl.className += ' from'
        toEl.className += ' to'
      },
      'OUTBOX': function( lineNumber, arg ){
        var fromEl = dom.hand.querySelector( '.tile' )
        var tile = document.createElement( 'li' )
        tile.className = 'tile to'
        
        dom.outbox.insertBefore( tile, dom.outbox.firstChild )
        fromEl.className += ' from'
      },
      'COPYFROM': tileToHand,
      'COPYTO': function( lineNumber, arg ){
        var i
        var toEl
        
        if( typeof arg === 'number' ){
          i = arg
        } else {
          i = parseInt( arg.substr( 1 ) )
          toEl = dom.floor.querySelector( '.floor-' + i )
          toEl.className += ' to-reference'
          i = Number( toEl.textContent )
        }
        
        toEl = dom.floor.querySelector( '.floor-' + i )
        var fromEl = dom.hand.querySelector( '.tile' )
        
        fromEl.className += ' from'
        toEl.className += ' to'                  
      },
      'BUMPUP': tileToHand,
      'BUMPDN': tileToHand,
      'SUB': tileToHand,
      'ADD': tileToHand,
      'JUMP': jump,
      'JUMPN': jump,
      'JUMPZ': jump
    }
    
    function highlight( program, lineNumber ){
      if( typeof program[ lineNumber ] === 'undefined' )
        return
      
      var instr = program[ lineNumber ][ 0 ]
      var arg = program[ lineNumber ][ 1 ]
      
      if( highlighters[ instr ] ){
        highlighters[ instr ]( lineNumber, arg )
      }
    }
    
    function setLevelName( level ){
      dom.levelName.innerHTML = ''
      
      var name = document.createElement( 'em' )
      
      name.textContent = level.number + '. ' + level.name
      
      dom.levelName.appendChild( name )
    }
    
    function getOrSetStep( current ){
      if( current !== undefined ){
        dom.stepSelect.value = current  
      }
      
      return Number( dom.stepSelect.value )
    }    
    
    function setSteps( max ){
      dom.stepSelect.max = max
    }
    
    function getSource(){
      return dom.code.value
    }
    
    init()
    
    return {
      reset: reset,
      level: getLevel,
      levelName: setLevelName,
      source: getSource,
      inbox: setInbox,
      outbox: setOutbox,
      floor: setFloor,
      hand: setHand,
      program: setProgram,
      state: function( state ){
        setState[ state ]()
      },
      step: getOrSetStep,
      steps: setSteps      
    }  
  }

  function Floor( level ){
    if( !level.floor ) return {
      tiles: [],
      rows: 0,
      columns: 0
    }
    
    var tiles = []
    var size = level.floor.columns * level.floor.rows
    
    for( var i = 0; i < size; i++ ){
      tiles[ i ] = level.floor.tiles ? level.floor.tiles[ i ] : null
    }          
    
    return {
      tiles: tiles,
      columns: level.floor.columns,
      rows: level.floor.rows
    }
  }

  function Level( n ){
    return levelData.find( function( level ){
      return level.number === n
    })
  }
  
  function Inbox( level ){
    return level.examples[ 0 ].inbox
  }
})()