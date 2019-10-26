import React from 'react';
import TopControls from './components/TopControls';
import CanvasOverlay from './components/CanvasOverlay';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: [
      ],
      mode: 'view',
      submode: null,
      display_mode: 'view',
      message: '',
      current_click: null,
      last_click: null,
    }
  }

  add_area_to_redact(new_area) {
    const a2r = this.state.areas_to_redact.slice();
    a2r.push(new_area);
    this.setState({areas_to_redact: a2r});
  }
  
  handleSetMode = (mode, submode) => {
    const message = this.getMessage(mode, submode);
    const display_mode = this.getDisplayMode(mode, submode);
    this.setState({
      mode: mode,
      submode: submode,
      message: message,
      display_mode: display_mode,
    });
  }

  getMessage(mode, submode) {
      let msg = '';
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
    let disp_mode = 'View';
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

  handleImageClick = (e) => {
    let x = e.nativeEvent.offsetX;
    let y = e.nativeEvent.offsetY;

    let message = 'got a click at ('+x+', '+y+')';
    console.log(message);

    if (this.state.mode === 'add_1') {
      this.handleAddFirst(x, y);
    } else if (this.state.mode === 'add_2') {
      this.handleAddSecond(x, y);
    } else if (this.state.mode === 'delete') {
      this.handleDelete(x, y);
    } else if (this.state.mode === 'delete_1') {
      this.handleDeleteFirst(x, y);
    } else if (this.state.mode === 'delete_2') {
      this.handleDeleteSecond(x, y);
    }
  }

  handleAddFirst(x_rel, y_rel) {
    this.setState({
      last_click: [x_rel, y_rel],
      mode: 'add_2',
      message: this.getMessage('add_2', this.state.submode),
    });
  }

  handleAddSecond(x, y) {
    let msg='adding a box from '+this.state.last_click[0]+' '+this.state.last_click[1]
    msg += '  to '+x+'  '+y+'   ';
    console.log(msg);
    let deepCopyAreasToRedact = JSON.parse(JSON.stringify(this.state.areas_to_redact));
    let new_a2r = {
      start: [this.state.last_click[0], this.state.last_click[1]],
      end: [x, y],
      text: 'you got it hombre',
    };
    deepCopyAreasToRedact.push(new_a2r);

    const display_mode = this.getDisplayMode('view');
    this.setState({
      last_click: null,
      mode: 'add_1',
      message: 'region was successfully added, select another region to add, press cancel when done',
      areas_to_redact: deepCopyAreasToRedact,
    });
  }

  handleDeleteFirst(x, y) {
    const display_mode = this.getDisplayMode('delete_2');
    this.setState({
      last_click: [x, y],
      mode: 'delete_2',
      message: this.getMessage('delete_2', this.state.submode),
    });
  }

  handleDeleteSecond(x, y) {
    let msg='deleting a box from '+this.state.last_click[0]+' '+this.state.last_click[1]
    msg += '  to '+x+'  '+y+'   ';
    console.log(msg);

    let new_areas_to_redact = [];
    for (var i=0; i < this.state.areas_to_redact.length; i++) {
      let a2r = this.state.areas_to_redact[i];
      var start_is_within_delete_box = false;
      var end_is_within_delete_box = false;
      if (this.state.last_click[0] <= a2r['start'][0]  && a2r['start'][0] <= x &&
          this.state.last_click[1] <= a2r['start'][1]  && a2r['start'][1] <= y) {
        start_is_within_delete_box = true;
      } 
      if (this.state.last_click[0] <= a2r['end'][0]  && a2r['end'][0] <= x &&
          this.state.last_click[1] <= a2r['end'][1]  && a2r['end'][1] <= y) {
        end_is_within_delete_box = true;
      } 
      if (start_is_within_delete_box && end_is_within_delete_box) {
        console.log('deleting '+i);
      } else {
        console.log('keeping '+i);
        new_areas_to_redact.push(a2r);
      }
    }
    if (new_areas_to_redact.length !== this.state.areas_to_redact.length) {
      this.setState({
        mode: 'delete_1',
        message: 'region was successfully deleted, select another region to delete, press cancel when done',
        areas_to_redact: new_areas_to_redact,
      });
    } else {
      this.setState({
        mode: 'delete_1',
        message: this.getMessage('delete_1', this.state.submode),
      });
    }
  }

  handleDelete(x, y) {
    let new_areas_to_redact = [];
    for (var i=0; i < this.state.areas_to_redact.length; i++) {
        let a2r = this.state.areas_to_redact[i];
        if (a2r['start'][0] <= x  && x <= a2r['end'][0] &&
            a2r['start'][1] <= y  && y <= a2r['end'][1]) {
        } else {
          new_areas_to_redact.push(a2r);
        }
      
    }
    if (new_areas_to_redact.length !== this.state.areas_to_redact.length) {
      const display_mode = this.getDisplayMode('view');
      this.setState({
        mode: 'view',
        message: 'region was successfully deleted',
        areas_to_redact: new_areas_to_redact,
        display_mode: display_mode,
      });
    }
  }

  handleResetAreasToRedact = () => {
    this.setState({
      areas_to_redact: [],
    });
  }

  render() {
    return (
      <div id='container' className='App container'>
        <div id='image_redactor_panel' className='xrow'>
          <div id='image_and_canvas_wrapper' className='row'>
            <BaseImage />
            <CanvasOverlay
              areas_to_redact={this.state.areas_to_redact}
              mode={this.state.mode}
              submode={this.state.submode}
              clickCallback= {this.handleImageClick}
              image_width={1600}
              image_height={900}
            />
          </div>
          <div id='controls_wrapper' className='row'>
            <div className='col'>
              <TopControls 
                areas_to_redact={this.state.areas_to_redact}
                mode={this.state.mode}
                display_mode={this.state.display_mode}
                submode={this.state.submode}
                message={this.state.message}
                setModeCallback= {this.handleSetMode}
                clearRedactAreasCallback = {this.handleResetAreasToRedact}
              />
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
        <img id='base_image_id' 
          alt='whatever' 
          src='images/frame_00187.png' />
      </div>
    );
  }
}

export default App;
