(function(){
  'use strict'
  
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
  
  stop()
  
  function stop(){
    var level = Level( view.level() )
    var floor = Floor( level )
    var inbox = Inbox( level )
    
    //if you don't do this, the UI won't always refresh after a try-catch!
    setTimeout( function(){
      view.reset()
      view.state( states.notRunning )
      view.inbox( inbox )
      view.floor( floor )      
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
      step()
    }
  }
  
  function init(){
    var level = Level( view.level() )
    var floor = Floor( level )
    var inbox = Inbox( level )
    var source = view.source()
    var program;

    try{
      program = hrm.parser( source )
    } catch( e ){
      alert( e )
      stop()
      return
    }
    
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
  }
  
  function step(){
    if( !cpu ){
      init()
    }
    
    if( stepIndex + 1 < steps.length ){
      stepIndex++            
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
      floorTiles: document.querySelector( '#floor #floorTiles' ),
      tiles: document.querySelector( '#floor #tiles' ),
      code: document.querySelector( '#code > textarea' ),
      program: document.querySelector( '#code > pre' ),
      level: document.getElementById( 'level' ),
      run: document.getElementById( 'run' ),
      stop: document.getElementById( 'stop' ),
      back: document.getElementById( 'back' ),
      step: document.getElementById( 'step' ),
      stepControl: document.getElementById( 'stepSelect' ),
      stepSelect: document.querySelector( '#stepSelect > input' ),
      stepsCaption: document.querySelector( '#stepSelect > span' ),
      hand: document.getElementById( 'hand' ),
      handValue: document.querySelector( '#hand > span' )
    }
    
    function init(){
      dom.level.addEventListener( 'change', onStop, false )
      dom.stop.addEventListener( 'click', onStop, false )
      dom.back.addEventListener( 'click', onBack, false )
      dom.run.addEventListener( 'click', onRun, false )
      dom.step.addEventListener( 'click', onStep, false )
      dom.stepSelect.addEventListener( 'change', onStepSelect, false )
      
      initLevelSelect()
    }
    
    function initLevelSelect(){
      dom.level.innerHTML = ''
      
      hrm.levelData.forEach( function( level, i ){
        if( level.cutscene ) return;
        
        var option = document.createElement( 'option' )
        
        option.value = level.number
        option.text = level.number + '. ' + level.name
        option.selected = level.number === 1
        
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
      
      dom.stepControl.hidden = true
      dom.stepSelect.min = 0
      dom.stepSelect.max = 1
      dom.stepSelect.value = 0
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
      
      dom.stepControl.hidden = false      
      dom.stepsCaption.textContent = dom.stepSelect.value + '/' + dom.stepSelect.max
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
      
      dom.stepControl.hidden = false
      dom.stepsCaption.textContent = dom.stepSelect.value + '/' + dom.stepSelect.max
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
      
      dom.stepControl.hidden = false
      dom.stepsCaption.textContent = dom.stepSelect.value + '/' + dom.stepSelect.max
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
            
          if( value === 0 || value ){
            tile.textContent = value            
            tile.className = 'tile ' + typeof value
          } else {
            tile.className = 'tile'
          }
            
          floorTile.appendChild( tile )
          
          var span = document.createElement( 'span' )
          
          span.textContent = i

          floorTile.appendChild( span )
          
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
    
    function setProgram( value, lineNumber ){
      dom.program.innerHTML = ''
      
      value.forEach( function( line, i ){
        var p = lineNumber === i ? '>' : ' '
        
        var n = String( i )
        while( n.length < 3 ){
          n = ' ' + n
        }
        
        var s = line[ 0 ]
        while( s.length < 9 ){
          s += ' '
        }
        
        var l = p + ' ' + n + ' ' + s
        
        if( line.length > 1 ){
          var arg = line[ 1 ]
          while( arg.length < 5 ){
            arg += ' '
          }
          l += arg
        } else {
          l += '     '
        }
        
        l += '\n'
        
        var span = document.createElement( 'span' )
        
        span.textContent = l
        
        /*
        if( lineNumber === i ){
          span.className = 'current'
        }
        */
        
        dom.program.appendChild( span )
      })
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
    return hrm.levelData.find( function( level ){
      return level.number === n
    })
  }
  
  function Inbox( level ){
    return level.examples[ 0 ].inbox
  }
})()