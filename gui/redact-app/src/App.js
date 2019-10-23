import React from 'react';
import './App.css';

class App extends React.Component {
  render() {
    return (
      <div id='container' className='App container'>
        <ImageRedactorPanel />
      </div>
    );
  }
}

class ImageRedactorPanel extends React.Component {
  render() {
    return (
      <div id='image_redactor_panel'>
        <BaseImage />
        <ImageCanvas />
        <div className='row'>
          <div className='col'>
            <TopControls />
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
    this.clearMode= this.clearMode.bind(this);
    this.resetImage= this.resetImage.bind(this);
  }

  resetImage() {
    this.setState({
      mode: 'GONNA GET UGLY'
    });
  }

  clearMode() {
    this.setState({
      mode: 'VIEW'
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
              <a className='dropdown-item' href='./index.html'>Box</a>
              <a className='dropdown-item' href='./index.html'>OCR</a>
              <a className='dropdown-item' href='./index.html'>Flood</a>
              <a className='dropdown-item' href='./index.html'>Polyline</a>
            </div>
          </div>
          <div className='col' id='delete_div'>
            <button className='btn btn-primary dropdown-toggle' type='button' id='deleteDropdownButton'
                data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
              Delete
            </button>
            <div className='dropdown-menu' aria-labelledby='deleteDropdownButton'>
              <a className='dropdown-item' href='./index.html'>Item</a>
              <a className='dropdown-item' href='./index.html'>Box (all in)</a>
              <a className='dropdown-item' href='./index.html'>Box (part in)</a>
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
