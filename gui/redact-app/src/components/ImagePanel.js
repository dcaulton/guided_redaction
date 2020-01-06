import React from 'react'
import TopImageControls from './TopImageControls'
import CanvasImageOverlay from './CanvasImageOverlay'
import {getMessage, getDisplayMode} from './redact_utils.js'

class ImagePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'View',
      submode: null,
      display_mode: 'View',
      message: '',
      last_click: null,
    }
    this.getImageAndHashDisplay=this.getImageAndHashDisplay.bind(this)
    this.setOcrDoneMessage=this.setOcrDoneMessage.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.redactImage=this.redactImage.bind(this)
    this.submitImageJob=this.submitImageJob.bind(this)
  }

  submitImageJob(job_string, extra_data = '') {                                                                         
    if (job_string === 'template_match') {                                                                       
      const job_data = this.buildTemplateMatchJobdata(extra_data)                                                       
      function afterLoaded() {                                                                                          
        this.setMessage('template match completed')                                                                     
      }                                                                                                                 
      let boundAfterLoaded=afterLoaded.bind(this)                                                                       
      this.props.submitJob(job_data, this.setMessage('template match job was submitted'), true, boundAfterLoaded)       
    } 
  }  

  buildTemplateMatchJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template'
    job_data['description'] = 'single template single image match'
    if (extra_data === 'all') {
      console.log("gotta implement all templates soon, aborting for now")
      return
    }
    let template = this.props.templates[extra_data]
    job_data['request_data']['template'] = template
    job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
    job_data['request_data']['template_id'] = template['id']
    const wrap = {}

    const fake_movie = this.buildCustomOneImageMovie()
    wrap[this.props.movie_url] = fake_movie
    job_data['request_data']['target_movies'] = wrap

    return job_data
  }

  buildCustomOneImageMovie() {
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.image_url)
    let newMovie = {
      framesets: {},
      frames: [],
    }
    newMovie['framesets'][frameset_hash] = this.props.movies[this.props.movie_url]['framesets'][frameset_hash]
    newMovie['frames'].push(this.props.image_url)
    return newMovie
  }

  setMessage(the_message)  {
    this.setState({
      message: the_message,
    })
  }

  //TODO THIS whole method can go away now
  setMode = (mode, submode) => {
    const message = getMessage(mode, submode);
    const display_mode = getDisplayMode(mode, submode);
    this.setState({
      mode: mode,
      submode: submode,
      display_mode: display_mode,
      message: message,
    })
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

    if (this.state.mode === 'add_1') {
      this.setState({
        mode: 'add_2',
        last_click: [x_scaled, y_scaled],
      })
      this.setMessage(getMessage('add_2', this.state.submode))
    } else if (this.state.mode === 'add_2') {
      this.handleAddSecond(x_scaled, y_scaled)
    } else if (this.state.mode === 'delete') {
      this.handleDelete(x_scaled, y_scaled)
    } else if (this.state.mode === 'delete_1') {
      this.setState({
        mode: 'delete_2',
        last_click: [x_scaled, y_scaled],
      })
      this.setMessage(getMessage('delete_2', this.state.submode))
    } else if (this.state.mode === 'delete_2') {
      this.handleDeleteSecond(x_scaled, y_scaled)
    }
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
        mode: 'add_1',
        last_click: null,
      })
      this.setMessage('region was successfully added, select another region to add, press cancel when done')
      this.props.addRedactionToFrameset(deepCopyAreasToRedact)
    } else if (this.state.submode === 'ocr') {
      const current_click = [x, y]
      this.props.callOcr(current_click, this.state.last_click, this.setOcrDoneMessage)
      this.setState({
        mode: 'add_1',
        last_click: null,
      })
      this.setMessage( 'processing OCR, please wait')
    }
  }

  setOcrDoneMessage() {
    this.setMessage('OCR detected regions were added, select another region to scan, press cancel when done')
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
      })
      this.setMessage('region was successfully deleted, select another region to delete, press cancel when done')
      this.props.addRedactionToFrameset(new_areas_to_redact)
    } else {
      this.setState({
        mode: 'delete_1',
      })
      this.setMessage(getMessage('delete_1', this.state.submode))
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
      this.setMessage('region was successfully deleted, continue selecting regions, press cancel when done')
      this.props.addRedactionToFrameset(new_areas_to_redact)
    }
  }

  handleResetAreasToRedact = () => {
    this.props.clearCurrentFramesetRedactions()
    document.getElementById('base_image_id').src = this.props.image_url
  }

  redactImage()  {
    let pass_arr = []
    const areas_to_redact = this.props.getRedactionFromFrameset()
    for (let i=0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i]
      pass_arr.push([a2r['start'], a2r['end']])
    }
    if (pass_arr.length > 0) {
      this.props.callRedact(pass_arr, this.props.image_url, this.setMessage('Regions have been redacted'))
    } else {
      this.setMessage('Nothing to redact has been specified')
    }
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
  
  buildTemplateButton() {
    return ('template button')
  }

  render() {
    let the_image_url = this.props.image_url
    let next_button = this.get_next_button()
    let prev_button = this.get_prev_button()
    if (this.props.getRedactedImageUrl()) {
      the_image_url = this.props.getRedactedImageUrl()
    }
    return (
      <div id='redaction_panel_container'>
        <div id='image_redactor_panel'>

          <div id='controls_wrapper' className='row'>
            <div className='col'>
              <TopImageControls 
                mode={this.state.mode}
                templates={this.props.templates}
                display_mode={this.state.display_mode}
                submode={this.state.submode}
                message={this.state.message}
                setMode= {this.setMode}
                redactImage={this.redactImage}
                changeMaskMethodCallback={this.props.setMaskMethod}
                getRedactedImageUrl={this.props.getRedactedImageUrl}
                setImageUrlCallback={this.props.setImageUrlCallback}
                getImageAndHashDisplay={this.getImageAndHashDisplay}
                setMessage={this.setMessage}
                clearCurrentFramesetRedactions={this.props.clearCurrentFramesetRedactions}
                whenDoneTarget={this.props.whenDoneTarget}
                gotoWhenDoneTarget={this.props.gotoWhenDoneTarget}
                submitImageJob={this.submitImageJob}
              />
            </div>
          </div>


          <div id='image_and_next_prev_buttons' className='row'>
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
                  mode={this.state.mode}
                  submode={this.state.submode}
                  image_width={this.props.image_width}
                  image_height={this.props.image_height}
                  image_scale={this.props.image_scale}
                  clickCallback= {this.handleImageClick}
                  last_click= {this.state.last_click}
                  getRedactionFromFrameset={this.props.getRedactionFromFrameset}
                />
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
