import React from 'react'
import TopImageControls from './TopImageControls'
import AdvancedImageControls from './AdvancedImageControls'
import CanvasOverlay from './CanvasOverlay'
import {getMessage, getDisplayMode} from './redact_utils.js'

class ImagePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'View',
      submode: null,
      display_mode: 'View',
      message: '',
      current_click: null,
      last_click: null,
      showAdvancedControls: true,
    }
  }

  handleSetMode = (mode, submode) => {
    const message = getMessage(mode, submode);
    const display_mode = getDisplayMode(mode, submode);
    this.setState({
      mode: mode,
      submode: submode,
      message: message,
      display_mode: display_mode,
    })
  }

  handleImageClick = (e) => {
    let x = e.nativeEvent.offsetX
    let y = e.nativeEvent.offsetY

    if (this.state.mode === 'add_1') {
      this.handleAddFirst(x, y)
    } else if (this.state.mode === 'add_2') {
      this.handleAddSecond(x, y)
    } else if (this.state.mode === 'delete') {
      this.handleDelete(x, y)
    } else if (this.state.mode === 'delete_1') {
      this.handleDeleteFirst(x, y)
    } else if (this.state.mode === 'delete_2') {
      this.handleDeleteSecond(x, y)
    }
  }

  handleAddFirst(x_rel, y_rel) {
    this.setState({
      last_click: [x_rel, y_rel],
      mode: 'add_2',
      message: getMessage('add_2', this.state.submode),
    })
  }

  handleAddSecond(x, y) {
    if (this.state.submode === 'box') {
      let deepCopyAreasToRedact = this.props.getRedactionFromFrameset()
      let new_a2r = {
        start: [this.state.last_click[0], this.state.last_click[1]],
        end: [x, y],
        text: 'you got it hombre',
        id: Math.floor(Math.random() * 1950960),
      }
      deepCopyAreasToRedact.push(new_a2r)

      this.setState({
        last_click: null,
        mode: 'add_1',
        message: 'region was successfully added, select another region to add, press cancel when done',
      })
      this.props.addRedactionToFrameset(deepCopyAreasToRedact)
    } else if (this.state.submode === 'ocr') {
      const current_click = [x, y]
      this.callOcr(current_click, this.state.last_click)
      this.setState({
        last_click: null,
        mode: 'add_1',
        message: 'processing OCR, please wait',
      })
    }
  }

  callOcr(current_click, last_click) {
    fetch(this.props.analyze_url, {
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
      })
      this.props.addRedactionToFrameset(deepCopyAreasToRedact)
    })
    .catch((error) => {
      console.error(error)
    })
    
    return []
  }

  handleDeleteFirst(x, y) {
    this.setState({
      last_click: [x, y],
      mode: 'delete_2',
      message: getMessage('delete_2', this.state.submode),
    })
  }

  handleDeleteSecond(x, y) {
    let new_areas_to_redact = [];
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (var i=0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i];
      var start_is_within_delete_box = false
      var end_is_within_delete_box = false
      if (this.state.last_click[0] <= a2r['start'][0]  && a2r['start'][0] <= x &&
          this.state.last_click[1] <= a2r['start'][1]  && a2r['start'][1] <= y) {
        start_is_within_delete_box = true
      } 
      if (this.state.last_click[0] <= a2r['end'][0]  && a2r['end'][0] <= x &&
          this.state.last_click[1] <= a2r['end'][1]  && a2r['end'][1] <= y) {
        end_is_within_delete_box = true
      } 
      if (start_is_within_delete_box && end_is_within_delete_box) {
      } else {
        new_areas_to_redact.push(a2r)
      }
    }
    if (new_areas_to_redact.length !== areas_to_redact.length) {
      this.setState({
        mode: 'delete_1',
        message: 'region was successfully deleted, select another region to delete, press cancel when done',
      })
      this.props.addRedactionToFrameset(new_areas_to_redact)
    } else {
      this.setState({
        mode: 'delete_1',
        message: getMessage('delete_1', this.state.submode),
      })
    }
  }

  handleDelete(x, y) {
    let new_areas_to_redact = [];
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (var i=0; i < areas_to_redact.length; i++) {
        let a2r = areas_to_redact[i]
        if (a2r['start'][0] <= x  && x <= a2r['end'][0] &&
            a2r['start'][1] <= y  && y <= a2r['end'][1]) {
        } else {
          new_areas_to_redact.push(a2r)
        }
      
    }
    if (new_areas_to_redact.length !== areas_to_redact.length) {
      this.setState({
        message: 'region was successfully deleted, continue selecting regions, press cancel when done',
      })
      this.props.addRedactionToFrameset(new_areas_to_redact)
    }
  }

  handleResetAreasToRedact = () => {
    this.props.addRedactionToFrameset([])
    this.props.setRedactedImageUrl('')
    document.getElementById('base_image_id').src = this.props.image_url
  }

  handleRedactCall = () => {
    let pass_arr = []
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (let i=0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i]
      pass_arr.push([a2r['start'], a2r['end']])
    }
    this.callRedact(pass_arr)
  }

  async callRedact(areas_to_redact_short) {
    let response = await fetch(this.props.redact_url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas_to_redact: areas_to_redact_short,
        mask_method: this.props.mask_method,
        image_url: this.props.image_url,
        return_type: 'url',
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let redacted_image_url = responseJson['redacted_image_url']
      this.props.setRedactedImageUrl(redacted_image_url)
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  render() {
    let the_image_url = this.props.image_url
    if (this.props.redacted_image_url) {
      the_image_url = this.props.redacted_image_url
    }
    return (
      <div id='redaction_panel_container'>
        <div id='image_redactor_panel'>
          <div id='image_and_canvas_wrapper' className='row'>
            <BaseImage 
              image_url={the_image_url}
              image_file={this.props.image_file}
            />
            <CanvasOverlay
              framesets={this.props.framesets}
              mode={this.state.mode}
              submode={this.state.submode}
              image_width={this.props.image_width}
              image_height={this.props.image_height}
              clickCallback= {this.handleImageClick}
              last_click= {this.state.last_click}
              getRedactionFromFrameset={this.props.getRedactionFromFrameset}
            />
          </div>
          <div id='advanced_controls_wrapper' className='row'>
            <div className='col'>
              <AdvancedImageControls 
                showAdvancedControls={this.state.showAdvancedControls}
                setModeCallback= {this.handleSetMode}
              />
            </div>
          </div>
          <div id='controls_wrapper' className='row'>
            <div className='col'>
              <TopImageControls 
                mode={this.state.mode}
                display_mode={this.state.display_mode}
                submode={this.state.submode}
                message={this.state.message}
                setModeCallback= {this.handleSetMode}
                clearRedactAreasCallback = {this.handleResetAreasToRedact}
                doRedactCallback = {this.handleRedactCall}
                changeMaskMethodCallback= {this.props.setMaskMethod}
                redacted_image_url={this.props.redacted_image_url}
                getNextImageLink={this.props.getNextImageLink}
                getPrevImageLink={this.props.getPrevImageLink}
                setImageUrlCallback={this.props.setImageUrlCallback}
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
          alt={the_src}
          src={the_src}
        />
      </div>
    )
  }
}

export default ImagePanel;
