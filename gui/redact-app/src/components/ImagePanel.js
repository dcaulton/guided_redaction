import React from 'react'
import {autorun, observable} from 'mobx'
import {observer} from 'mobx-react'
import TopImageControls from './TopImageControls'
import AdvancedImageControls from './AdvancedImageControls'
import CanvasImageOverlay from './CanvasImageOverlay'
import {getMessage, getDisplayMode} from './redact_utils.js'

const ImagePanel = observer(class ImagePanel extends React.Component {
  constructor(props) {
    super(props);
    this.local_state = observable({
      mode: 'View',
      submode: null,
      display_mode: 'View',
      message: '',
      last_click: null,
    })
    this.getImageAndHashDisplay=this.getImageAndHashDisplay.bind(this)
    this.setOcrDoneMessage=this.setOcrDoneMessage.bind(this)
    this.setRedactionDoneMessage=this.setRedactionDoneMessage.bind(this)
    this.setRedactedImage=this.setRedactedImage.bind(this)

    
    autorun(() => {
    this.setRedactedImage(this.props.redacted_image_url)
      console.log("autorunning ladies!")
      console.log(this.props.redacted_image_url)
      if (document.getElementById('base_image_id')) {
      }
    })
  }
  setRedactedImage(redacted_url) {
    console.log("autorunning bitches!")
    if (document.getElementById('base_image_id')) {
    console.log("peep"+redacted_url)
      if (redacted_url) {
        console.log('we have a redacted image, should be setting the img source here')
      }
    }
  }

  //TODO THIS whole method can go away now
  handleSetMode = (mode, submode) => {
    const message = getMessage(mode, submode);
    const display_mode = getDisplayMode(mode, submode);
    this.local_state.mode = mode
    this.local_state.submode = submode
    this.local_state.display_mode = display_mode
    this.local_state.message = message
  }

  handleImageClick = (e) => {
    let x = e.nativeEvent.offsetX
    let y = e.nativeEvent.offsetY
    const scale = (document.getElementById('base_image_id').width /
      document.getElementById('base_image_id').naturalWidth)
    this.props.setImageScale(scale)
    const x_scaled = parseInt(x / scale)
    const y_scaled = parseInt(y / scale)
    if (x_scaled > this.props.image_width || y_scaled > this.props.image_height) {
      return
    }

    if (this.local_state.mode === 'add_1') {
      this.local_state.mode = 'add_2'
      this.local_state.message = getMessage('add_2', this.local_state.submode)
      this.local_state.last_click = [x_scaled, y_scaled]
    } else if (this.local_state.mode === 'add_2') {
      this.handleAddSecond(x_scaled, y_scaled)
    } else if (this.local_state.mode === 'delete') {
      this.handleDelete(x_scaled, y_scaled)
    } else if (this.local_state.mode === 'delete_1') {
      this.local_state.mode = 'delete_2'
      this.local_state.message = getMessage('delete_2', this.local_state.submode)
      this.local_state.last_click = [x_scaled, y_scaled]
    } else if (this.local_state.mode === 'delete_2') {
      this.handleDeleteSecond(x_scaled, y_scaled)
    }
  }

  handleAddSecond(x, y) {
    if (this.local_state.submode === 'box') {
      let deepCopyAreasToRedact = this.props.getRedactionFromFrameset()
      let new_a2r = {
        start: [this.local_state.last_click[0], this.local_state.last_click[1]],
        end: [x, y],
        text: 'you got it hombre',
        id: Math.floor(Math.random() * 1950960),
      }
      deepCopyAreasToRedact.push(new_a2r)

      this.local_state.mode = 'add_1'
      this.local_state.message = 'region was successfully added, select another region to add, press cancel when done'
      this.local_state.last_click = null
      this.props.addRedactionToFrameset(deepCopyAreasToRedact)
    } else if (this.local_state.submode === 'ocr') {
      const current_click = [x, y]
      this.props.callOcr(current_click, this.local_state.last_click, this.setOcrDoneMessage)
      this.local_state.mode = 'add_1'
      this.local_state.message = 'processing OCR, please wait'
      this.local_state.last_click = null
    }
  }

  setOcrDoneMessage() {
    this.local_state.message = 'OCR detected regions were added, select another region to scan, press cancel when done'
  }

  getImageAndHashDisplay() {
    if (this.props.image_url) {
      const parts = this.props.image_url.split('/')
      const img_filename = parts[parts.length-1]
      const img_hash = this.props.getFramesetHashForImageUrl(this.props.image_url)
      return (<span>image: {img_filename}, frameset hash: {img_hash}</span>)
    }
  }

  handleDeleteSecond(x, y) {
    let new_areas_to_redact = [];
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (var i=0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i];
      var start_is_within_delete_box = false
      var end_is_within_delete_box = false
      if (this.local_state.last_click[0] <= a2r['start'][0]  && a2r['start'][0] <= x &&
          this.local_state.last_click[1] <= a2r['start'][1]  && a2r['start'][1] <= y) {
        start_is_within_delete_box = true
      } 
      if (this.local_state.last_click[0] <= a2r['end'][0]  && a2r['end'][0] <= x &&
          this.local_state.last_click[1] <= a2r['end'][1]  && a2r['end'][1] <= y) {
        end_is_within_delete_box = true
      } 
      if (start_is_within_delete_box && end_is_within_delete_box) {
      } else {
        new_areas_to_redact.push(a2r)
      }
    }
    if (new_areas_to_redact.length !== areas_to_redact.length) {
      this.local_state.mode = 'delete_1'
      this.local_state.message = 'region was successfully deleted, select another region to delete, press cancel when done'
      this.props.addRedactionToFrameset(new_areas_to_redact)
    } else {
      this.local_state.mode = 'delete_1'
      this.local_state.message = getMessage('delete_1', this.local_state.submode)
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
      this.local_state.message = 'region was successfully deleted, continue selecting regions, press cancel when done'
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
    this.props.callRedact(pass_arr, this.props.image_url, this.setRedactionDoneMessage)
  }

  setRedactionDoneMessage() {
    this.local_state.message = 'Regions have been redacted'
  }

  get_next_button() {
    let next_image_link = ''
    let next_image_url = this.props.getNextImageLink()
    if (next_image_url) {
      next_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setImageUrlCallback(next_image_url)}
        >
          Next
        </button>
      )
    }
    return next_image_link
  }

  get_prev_button() {
    let prev_image_link = ''
    let prev_image_url = this.props.getPrevImageLink()
    if (prev_image_url) {
      prev_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setImageUrlCallback(prev_image_url)}
        >
          Prev
        </button>
      )
    }
    return prev_image_link
  }

  render() {
    let the_image_url = this.props.image_url
    let next_button = this.get_next_button()
    let prev_button = this.get_prev_button()
    if (this.props.redacted_image_url) {
      the_image_url = this.props.redacted_image_url
    }
    return (
      <div id='redaction_panel_container'>
        <div id='image_redactor_panel'>

          <div id='controls_wrapper' className='row'>
            <div className='col'>
              <TopImageControls 
                mode={this.local_state.mode}
                display_mode={this.local_state.display_mode}
                submode={this.local_state.submode}
                message={this.local_state.message}
                setModeCallback= {this.handleSetMode}
                clearRedactAreasCallback = {this.handleResetAreasToRedact}
                doRedactCallback = {this.handleRedactCall}
                changeMaskMethodCallback= {this.props.setMaskMethod}
                redacted_image_url={this.props.redacted_image_url}
                setImageUrlCallback={this.props.setImageUrlCallback}
                getImageAndHashDisplay={this.getImageAndHashDisplay}
              />
            </div>
          </div>

          <div className='row'>
            <div id='prev_button_col' className='col-lg-1'>
              {prev_button}
            </div>
            <div className='col-lg-10'>
              <div id='image_and_canvas_wrapper' className='row mt-2'>
                <BaseImage 
                  image_url={the_image_url}
                  image_file={this.props.image_file}
                />
                <CanvasImageOverlay
                  framesets={this.props.framesets}
                  mode={this.local_state.mode}
                  submode={this.local_state.submode}
                  image_width={this.props.image_width}
                  image_height={this.props.image_height}
                  image_scale={this.props.image_scale}
                  clickCallback= {this.handleImageClick}
                  last_click= {this.local_state.last_click}
                  getRedactionFromFrameset={this.props.getRedactionFromFrameset}
                />
              </div>
              <div id='advanced_controls_wrapper' className='row'>
                <div className='col'>
                  <AdvancedImageControls 
                    showAdvancedControls={this.props.showAdvancedPanels}
                    setModeCallback= {this.handleSetMode}
                  />
                </div>
              </div>
            </div>
            <div id='next_button_col' className='col-lg-1'>
              {next_button}
            </div>
          </div>

        </div>
      </div>
    );
  }
});

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
