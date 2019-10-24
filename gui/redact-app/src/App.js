import React from 'react';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: [],
      mode: 'VIEW',
      message: '',
    }
  }
  
  handle_image_click() {
    alert('someone clicked the image');
  }

  render() {
    return (
      <div id='container' className='App container'>
        <div id='image_redactor_panel'>
          <BaseImage />
          <ImageCanvas
            areas_to_redact={this.state.areas_to_redact}
            mode={this.state.mode}
          />
          <div className='row'>
            <div className='col'>
              <TopControls />
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
        <img id='base_image_id' alt='whatever' src='images/frame_00187.png' />
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
    }
  }

  render() {
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
      mode: 'VIEW'
    };
    this.addMode= this.addMode.bind(this);
    this.deleteMode= this.deleteMode.bind(this);
    this.clearMode= this.clearMode.bind(this);
    this.resetImage= this.resetImage.bind(this);
  }

  resetImage() {
    this.setState({
      mode: 'RESET'
    });
  }

  redactImage() {
    this.setState({
      mode: 'REDACT'
    });
  }

  clearMode() {
    this.setState({
      mode: 'VIEW'
    });
  }

  deleteMode(submode) {
    alert(submode);
    this.setState({
      mode: 'DELETE'
    });
  }

  addMode(submode) {
    alert(submode);
    this.setState({
      mode: 'ADD'
    });
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
                  onClick={() => this.addMode('box')} 
                  href='.'>
                Box
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.addMode('ocr')} 
                  href='.'>
                OCR
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.addMode('flood')} 
                  href='.'>
                Flood
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.addMode('polyline')} 
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
                  onClick={() => this.deleteMode('item')} 
                  href='.'>
                Item
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.deleteMode('box_all')} 
                  href='.'>
                Box (all in)
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.deleteMode('box_part')} 
                  href='.'>
                Box (part in)
              </button>
            </div>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary' 
                onClick={() => this.clearMode()}
                href='./index.html' >
              Cancel
            </button>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary' 
                onClick={() => this.resetImage()}
                href='./index.html' >
              Reset Image
            </button>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary'  
                onClick={() => this.redactImage()}
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
            <h3 id='mode_header' >{this.state.mode}</h3>
            <div id='mode_div'/>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
