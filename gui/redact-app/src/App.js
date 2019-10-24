import React from 'react';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: [2,1],
      mode: 'VIEW',
      submode: null,
      message: '',
      debuginfo: 'nifty',
      current_click: null,
      last_click: null,
    }
  }

  add_area_to_redact(new_area) {
    const a2r = this.state.areas_to_redact.slice();
    a2r.push(new_area);
    this.setState({areas_to_redact: a2r});
  }
  
  handle_image_click() {
    alert('someone clicked the image');
  }

  handleSetMode = (mode, submode) => {
    console.log('just got a handle_set_mode callback with ' + mode + ' ' + submode);
    this.setState({
        mode: mode,
        submode: submode,
      });
  }

  handle_add_area(e) {
    this.setState({message: 'area added'});
  }

  render() {
    return (
      <div id='container' className='App container'>
        <div id='image_redactor_panel'>
          <BaseImage />
          <ImageCanvas
            areas_to_redact={this.state.areas_to_redact}
            mode={this.state.mode}
            submode={this.state.submode}
            add_area_callback= {() => this.handle_add_area()}
          />
          <div className='row'>
            <div className='col'>
              <TopControls 
                areas_to_redact={this.state.areas_to_redact}
                mode={this.state.mode}
                submode={this.state.submode}
                setModeCallback= {this.handleSetMode}
              />
            </div>
          </div>
        </div>
        <div id='debug' className='row'>
          <div className='col'>
            <div id='debug'>
              {this.state.areas_to_redact}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class BaseImage extends React.Component {
  render() {
    return (
      <div id='base_image_div'>
        <img id='base_image_id' onClick={() => alert(5544)} alt='whatever' src='images/frame_00187.png' />
      </div>
    );
  }
}

class ImageCanvas extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: this.props.areas_to_redact,
      mode: this.props.mode,
      submode: this.props.submode,
      prev_x: this.props.prev_x,
      prev_y: this.props.prev_y,
    }
  }

  render() {
// todo draw all the selected areas here before rendering
    return (
      <div id='canvas_div'>
        <canvas id='overlay_canvas' />
      </div>
    );
  }
}

class TopControls extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: props.mode,
      submode: props.submode,
      message: props.message,
      debuginfo: props.debuginfo,
      areas_to_redact: props.areas_to_redact,
    };
  }

  render() {
    return (
      <div id='bottom_controls_div'>
        <div className='row'>
          <div className='col-md-1' />
          <div className='col' id='add_div'>
            <button className='btn btn-primary dropdown-toggle' type='button' id='addDropdownButton'
                data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
              Add
            </button>
            <div className='dropdown-menu' aria-labelledby='addDropdownButton'>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('ADD', 'box')} 
                  href='.'>
                Box
                {this.state.debuginfo}
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('ADD', 'ocr')} 
                  href='.'>
                OCR
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('ADD', 'flood')} 
                  href='.'>
                Flood
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('ADD', 'polyline')} 
                  href='.'>
                Polyline
              </button>
            </div>
          </div>
          <div className='col' id='delete_div'>
            <button className='btn btn-primary dropdown-toggle' type='button' id='deleteDropdownButton'
                data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
              Delete
            </button>
            <div className='dropdown-menu' aria-labelledby='deleteDropdownButton'>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('DELETE', 'item')} 
                  href='.'>
                Item
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('DELETE', 'box_all')} 
                  href='.'>
                Box (all in)
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('DELETE', 'box_part')} 
                  href='.'>
                Box (part in)
              </button>
            </div>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary' 
                onClick={() => this.props.setModeCallback('VIEW', '')}
                href='./index.html' >
              Cancel
            </button>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary' 
                onClick={() => this.props.setModeCallback('RESET', '')}
                href='./index.html' >
              Reset Image
            </button>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary'  
                onClick={() => this.props.setModeCallback('REDACT', '')}
                href='./index.html' >
              Redact
            </button>
          </div>
          <div className='col marquee_div'>
            <span>hiya</span>
          </div>
        </div>
        <div className='row'>
          <div className='col'>
            <h3 id='mode_header' >{this.props.mode} : {this.props.submode}</h3>
            <div id='mode_div'/>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
