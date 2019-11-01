import React from 'react';
import TopControls from './TopControls';
import CanvasOverlay from './CanvasOverlay';

class RedactionPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'View',
      submode: null,
      display_mode: 'View',
      message: '',
      current_click: null,
      last_click: null,
      mask_method: this.props.mask_method,
      image_file: this.props.image_file,
      analyze_url: this.props.analyze_url,
      redact_url: this.props.redact_url,
    }
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

  handleChangeMaskingMode = (new_mode) => {
    this.setState({
      mask_method: new_mode,
    });
  }

  handleAddSecond(x, y) {
    if (this.state.submode === 'box') {
      let msg='adding a box from '+this.state.last_click[0]+' '+this.state.last_click[1]
      msg += '  to '+x+'  '+y+'   ';
      console.log(msg);
      let deepCopyAreasToRedact = this.props.getRedactionFromFrameset()
      let new_a2r = {
        start: [this.state.last_click[0], this.state.last_click[1]],
        end: [x, y],
        text: 'you got it hombre',
        id: Math.floor(Math.random() * 1950960),
      };
      deepCopyAreasToRedact.push(new_a2r);

      this.setState({
        last_click: null,
        mode: 'add_1',
        message: 'region was successfully added, select another region to add, press cancel when done',
      });
      this.props.addRedactionToFrameset(deepCopyAreasToRedact)
    } else if (this.state.submode === 'ocr') {
      const current_click = [x, y]
      this.callOcr(current_click, this.state.last_click)
      this.setState({
        last_click: null,
        mode: 'add_1',
        message: 'processing OCR, please wait',
      });
    }
  }

  callOcr(current_click, last_click) {
    fetch(this.state.analyze_url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roi_start_x: last_click[0],
        roi_start_y: last_click[1],
        roi_end_x: current_click[0],
        roi_end_y: current_click[1],
        image_url: this.props.image_url,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let new_areas_to_redact = responseJson['recognized_text_areas']
      let deepCopyAreasToRedact = this.props.getRedactionFromFrameset()
      for (let i=0; i < new_areas_to_redact.length; i++) {
        deepCopyAreasToRedact.push(new_areas_to_redact[i]);
      }
      let mess = new_areas_to_redact.length 
      mess += ' OCR detected regions were added, select another region to scan, press cancel when done'
      this.setState({
        message: mess,
      });
      this.props.addRedactionToFrameset(deepCopyAreasToRedact)
    })
    .catch((error) => {
      console.error(error);
    });
    
    return [];
  }

  handleDeleteFirst(x, y) {
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
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (var i=0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i];
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
      } else {
        new_areas_to_redact.push(a2r);
      }
    }
    if (new_areas_to_redact.length !== areas_to_redact.length) {
      this.setState({
        mode: 'delete_1',
        message: 'region was successfully deleted, select another region to delete, press cancel when done',
      });
      this.props.addRedactionToFrameset(new_areas_to_redact)
    } else {
      this.setState({
        mode: 'delete_1',
        message: this.getMessage('delete_1', this.state.submode),
      });
    }
  }

  handleDelete(x, y) {
    let new_areas_to_redact = [];
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (var i=0; i < areas_to_redact.length; i++) {
        let a2r = areas_to_redact[i];
        if (a2r['start'][0] <= x  && x <= a2r['end'][0] &&
            a2r['start'][1] <= y  && y <= a2r['end'][1]) {
        } else {
          new_areas_to_redact.push(a2r);
        }
      
    }
    if (new_areas_to_redact.length !== areas_to_redact.length) {
      this.setState({
        message: 'region was successfully deleted, continue selecting regions, press cancel when done',
      });
      this.props.addRedactionToFrameset(new_areas_to_redact)
    }
  }

  handleResetAreasToRedact = () => {
    this.props.addRedactionToFrameset([])
    document.getElementById('base_image_id').src = this.props.image_url;
  }

  handleRedactCall = () => {
    let pass_arr = [];
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (let i=0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i];
      pass_arr.push([a2r['start'], a2r['end']]);
    }
    this.callRedact(pass_arr);
  }

  async callRedact(areas_to_redact_short) {
    let response = await fetch(this.state.redact_url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas_to_redact: areas_to_redact_short,
        mask_method: this.state.mask_method,
        image_url: this.props.image_url,
      }),
    })
    .catch((error) => {
      console.error(error);
    });
    let blob = await response.blob();
    document.getElementById('base_image_id').src = URL.createObjectURL(blob);
  }

  render() {
    return (
      <div id='redaction_panel_container'>
        <div id='image_redactor_panel' className='xrow'>
          <div id='image_and_canvas_wrapper' className='row'>
            <BaseImage 
              image_url={this.props.image_url}
              image_file={this.state.image_file}
            />
            <CanvasOverlay
              framesets={this.props.framesets}
              mode={this.state.mode}
              submode={this.state.submode}
              frameset_hash={this.props.frameset_hash}
              image_url={this.props.image_url}
              image_width={this.props.image_width}
              image_height={this.props.image_height}
              clickCallback= {this.handleImageClick}
              last_click= {this.state.last_click}
              getRedactionFromFrameset={this.props.getRedactionFromFrameset}
            />
          </div>
          <div id='controls_wrapper' className='row'>
            <div className='col'>
              <TopControls 
                mode={this.state.mode}
                display_mode={this.state.display_mode}
                submode={this.state.submode}
                message={this.state.message}
                setModeCallback= {this.handleSetMode}
                clearRedactAreasCallback = {this.handleResetAreasToRedact}
                doRedactCallback = {this.handleRedactCall}
                changeMaskMethodCallback= {this.handleChangeMaskingMode}
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
    var the_src = this.props.image_url
    return (
      <div id='base_image_div'>
        <img id='base_image_id' 
          alt='whatever' 
          src={the_src}
        />
      </div>
    );
  }
}

export default RedactionPanel;
