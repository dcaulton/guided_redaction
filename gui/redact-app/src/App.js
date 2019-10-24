import React from 'react';
import Thing from './components/Thing';
import TopControls from './components/TopControls';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: [2,1],
      mode: 'VIEW',
      submode: null,
      display_mode: 'view',
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
    var message = this.getMessage(mode, submode);
    var display_mode = this.getDisplayMode(mode, submode);
    this.setState({
      mode: mode,
      submode: submode,
      message: message,
      display_mode: display_mode,
    });
  }

  getMessage(mode, submode) {
      var msg = '';
      if (mode === 'add_1' && submode === 'box') {
        msg = 'click on the first corner of the box';
      } else if (mode === 'add_2' && submode === 'box') {
        msg = 'click on the second corner of the box';
      } else if (mode === 'add_1' && submode === 'ocr') {
        msg = 'click on the first corner of the region to scan for text';
      } else if (mode === 'add_2' && submode === 'ocr') {
        msg = 'click on the second corner of the region to scan for text';
      } else if (mode === 'delete' && submode === 'item') {
        msg = 'click anywhere within a box to delete that item';
      } else if (mode === 'delete_1' && submode === 'box_all') {
        msg = 'click on the first corner of the box';
      } else if (mode === 'delete_2' && submode === 'box_all') {
        msg = 'click on the second corner of the box';
      } else if (mode === 'redact') {
        msg = 'redacting selected areas';
      } else if (mode === 'reset') {
        msg = 'image has been reset';
      } else if (mode === 'clear') {
        msg = 'operation cancelled';
      } 
      return msg;
  }

  getDisplayMode(mode, submode) {
    var disp_mode = 'View';
    if (mode === 'add_1' && submode === 'box') {
      disp_mode = 'Add Box';
    } else if (mode === 'add_2' && submode === 'box') {
      disp_mode = 'Add Box';
    } else if (mode === 'add_1' && submode === 'ocr') {
      disp_mode = 'Add OCR';
    } else if (mode === 'add_2' && submode === 'ocr') {
      disp_mode = 'Add OCR';
    } else if (mode === 'delete' && submode === 'item') {
      disp_mode = 'Delete Item';
    } else if (mode === 'delete_1' && submode === 'box_all') {
      disp_mode = 'Delete Items in Box';
    } else if (mode === 'delete_2' && submode === 'box_all') {
      disp_mode = 'Delete Items in Box';
    } else if (mode === 'redact') {
      disp_mode = 'Redact';
    }
    return disp_mode;
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
                display_mode={this.state.display_mode}
                submode={this.state.submode}
                message={this.state.message}
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

export default App;
