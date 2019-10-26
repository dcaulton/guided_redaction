import React from 'react';
import TopControls from './components/TopControls';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: [
        {start: [10,10],
         end: [40,40],
         text: 'whatever dude'},
        {start: [130,60],
         end: [290,70],
         text: 'whatever babe'},
        {start: [1500,850],
         end: [1590,890],
         text: 'whatever hon'},
      ],
      mode: 'VIEW',
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

    let message = 'got a click at ('+x+', '+y+')-----';
    console.log(message);

    if (this.state.mode === 'add_1') {
      this.handleAddFirst(x, y);
    } else if (this.state.mode === 'add_2') {
      this.handleAddSecond(x, y);
    } else if (this.state.mode === 'delete') {
      this.handleDelete(x, y);
    } else if (this.state.mode === 'delete_1') {
      this.handleDeleteFirst(x, y);
    }
  }

  handleAddFirst(x_rel, y_rel) {
    console.log('add first');
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
    console.log('add second');
    let deepCopyAreasToRedact = JSON.parse(JSON.stringify(this.state.areas_to_redact));
    let new_a2r = {
      start: [this.state.last_click[0], this.state.last_click[1]],
      end: [x, y],
      text: 'you got it hombre',
    };
    deepCopyAreasToRedact.push(new_a2r);

    this.setState({
      last_click: null,
      mode: 'view',
      message: 'region was successfully added',
      areas_to_redact: deepCopyAreasToRedact,
    });
  }

  handleDeleteFirst(x_rel, y_rel) {
    console.log('delete first');
  }

  handleDelete(x_rel, y_rel) {
    console.log('delete');
  }

  handleResetAreasToRedact = () => {
    this.setState({
      areas_to_redact: [],
    });
  }
  render() {

    // TODO hang the click listener on the canvas, make the canvas the same size as the image
    // image height is document.getElementById('whatever').clientHeight or offsetHeight with scrollbar and borders
    return (
      <div id='container' className='App container'>
        <div id='image_redactor_panel' className='xrow'>
          <div id='image_and_canvas_wrapper' className='row'>
            <BaseImage />
            <ImageCanvas
              areas_to_redact={this.state.areas_to_redact}
              mode={this.state.mode}
              submode={this.state.submode}
              clickCallback= {this.handleImageClick}
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

  drawRectangles() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3';
    ctx.lineWidth = 3;
    for (let i= 0; i < this.props.areas_to_redact.length; i++) {
      console.log('drawing number '+i);
      let a2r = this.props.areas_to_redact[i];
      let width = a2r['end'][0] - a2r['start'][0];
      let height = a2r['end'][1] - a2r['start'][1];
      ctx.strokeRect(a2r['start'][0], a2r['start'][1], width, height);
    }
  }

  componentDidMount() {
    this.drawRectangles()
  }

  componentDidUpdate() {
    this.drawRectangles()
  }

  render() {
    return (
      <div id='canvas_div'>
        <canvas id='overlay_canvas' 
          ref='canvas'
          width={1600}
          height={900}
          onClick={(e) => this.props.clickCallback(e)}
        />
      </div>
    );
  }
}

export default App;
