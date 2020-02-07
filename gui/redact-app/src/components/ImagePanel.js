import React from 'react'
import TopImageControls from './TopImageControls'
import CanvasImageOverlay from './CanvasImageOverlay'
import {getMessage, getDisplayMode} from './redact_utils.js'

class ImagePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: '.',
      submode: null,
      display_mode: '.',
      message: '.',
      last_click: null,
      oval_center: null,
      illustrate_shaded: false,
    }
    this.setOcrDoneMessage=this.setOcrDoneMessage.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.redactImage=this.redactImage.bind(this)
    this.submitImageJob=this.submitImageJob.bind(this)
    this.setIllustrateShaded=this.setIllustrateShaded.bind(this)
    this.newImage=this.newImage.bind(this)
  }


  componentDidMount() {
    this.props.checkAndUpdateApiUris()
  }

  newImage() {
    this.props.setImageUrl('')
    this.setMode()
  }

  setIllustrateShaded() {
    this.setState({
      illustrate_shaded: true,
    })
  }

  submitImageJob(job_string, extra_data = '') {                                                                         
    if (job_string === 'template_match') {
      const job_data = this.buildTemplateMatchJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('template match job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('template match completed')},
        when_failed: () => {this.setMessage('template match failed')},
      })
    } else if (job_string === 'illustrate_box') {
      const job_data = this.buildIllustrateBoxJobdata(extra_data)
      console.log('bongo illustrate box job data: ')
      console.log(job_data)
      return
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('illustrate job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('illustration completed')},
        when_failed: () => {this.setMessage('illustration failed')},
      })
    } else if (job_string === 'illustrate_oval') {
      const job_data = this.buildIllustrateOvalJobdata(extra_data)
      console.log('bongo illustrate oval job data: ')
      console.log(job_data)
      return
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('illustrate job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('illustration completed')},
        when_failed: () => {this.setMessage('illustration failed')},
      })
    } 
  }  

  buildIllustrateOvalJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'illustrate'
    job_data['description'] = 'illustrate oval'
    job_data['request_data']['image_url'] = this.props.image_url
    const radius_x = Math.abs(this.state.last_click[0] - this.state.oval_center[0])
    const radius_y = Math.abs(extra_data['second_click'][1] - this.state.oval_center[1])
    const illustration_data = {
      type: 'oval',
      shade_outside: this.state.illustrate_shaded,
      center: this.state.oval_center,
      radius_x: radius_x,
      radius_y: radius_y,
      color: this.props.illustrate_color,
    }
    job_data['request_data']['illustration_data'] = illustration_data
    return job_data
  }

  buildIllustrateBoxJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'illustrate'
    job_data['description'] = 'illustrate box'
    job_data['request_data']['image_url'] = this.props.image_url
    let illustration_data = {
      type: 'box',
      shade_outside: this.state.illustrate_shaded,
      start: this.state.last_click,
      end: extra_data['second_click'],
      color: this.props.illustrate_color,
    }
    job_data['request_data']['illustration_data'] = illustration_data
    return job_data
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
  setMode = (mode='', submode='') => {
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
    if (this.props.image_url === '') {
      return
    }
    let x = e.nativeEvent.offsetX
    let y = e.nativeEvent.offsetY
    const x_scaled = parseInt(x / this.props.image_scale)
    const y_scaled = parseInt(y / this.props.image_scale)
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
    } else if (this.state.submode=== 'ill_oval_1') {
      this.setState({
        submode: 'ill_oval_2',
        oval_center: [x_scaled, y_scaled],
      })
      this.setMessage(getMessage('illustrate', 'ill_oval_2'))
    } else if (this.state.submode=== 'ill_oval_2') {
      this.setState({
        submode: 'ill_oval_3',
        last_click: [x_scaled, y_scaled],
      })
      this.setMessage(getMessage('illustrate', 'ill_oval_3'))
    } else if (this.state.submode=== 'ill_oval_3') {
      this.handleIllustrateOvalFinal(x_scaled, y_scaled)
    } else if (this.state.submode === 'ill_box_1') {
      this.setState({
        submode: 'ill_box_2',
        last_click: [x_scaled, y_scaled],
      })
      this.setMessage(getMessage('illustrate', 'ill_box_2'))
    } else if (this.state.submode=== 'ill_box_2') {
      this.handleIllustrateBoxFinal(x_scaled, y_scaled)
    }
  }

  handleIllustrateBoxFinal(x, y) {
    this.setState({
      mode: '.',
      submode: '',
      last_click: [],
    })
    this.submitImageJob(
      'illustrate_box', 
      {second_click: [x, y]},
    )
  }

  handleIllustrateOvalFinal(x, y) {
    this.setState({
      mode: '.',
      submode: '',
      last_click: [],
      oval_center: [],
    })
    this.submitImageJob(
      'illustrate_oval', 
      {second_click: [x, y]},
    )
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

  buildGetNextButton() {
    let next_image_link = ''
    let next_image_url = this.props.getNextImageLink()
    if (next_image_url) {
      next_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setImageUrl(next_image_url)}
        >
          Next
        </button>
      )
    }
    return next_image_link
  }

  buildGetPrevButton() {
    let prev_image_link = ''
    let prev_image_url = this.props.getPrevImageLink()
    if (prev_image_url) {
      prev_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setImageUrl(prev_image_url)}
        >
          Prev
        </button>
      )
    }
    return prev_image_link
  }
  
  render() {
    let the_image_url = this.props.image_url
    let next_button = this.buildGetNextButton()
    let prev_button = this.buildGetPrevButton()
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
                image_url={this.props.image_url}
                setMessage={this.setMessage}
                clearCurrentFramesetRedactions={this.props.clearCurrentFramesetRedactions}
                whenDoneTarget={this.props.whenDoneTarget}
                gotoWhenDoneTarget={this.props.gotoWhenDoneTarget}
                submitImageJob={this.submitImageJob}
                setIllustrateShaded={this.setIllustrateShaded}
                newImage={this.newImage}
              />
            </div>
          </div>


          <div id='image_and_next_prev_buttons' className='row'>
            <div id='prev_button_col' className='col-lg-1'>
              {prev_button}
            </div>
            <div className='col-lg-10'>
              <div id='image_and_canvas_wrapper' className='row'>
                <BaseImage 
                  image_url={the_image_url}
                  image_file={this.props.image_file}
                  setImageScale={this.props.setImageScale}
                />
                <CanvasImageOverlay
                  mode={this.state.mode}
                  submode={this.state.submode}
                  image_width={this.props.image_width}
                  image_height={this.props.image_height}
                  image_scale={this.props.image_scale}
                  image_url={this.props.image_url}
                  clickCallback= {this.handleImageClick}
                  last_click= {this.state.last_click}
                  oval_center= {this.state.oval_center}
                  getRedactionFromFrameset={this.props.getRedactionFromFrameset}
                  postMakeUrlCall={this.props.postMakeUrlCall}
                  setMessage={this.setMessage}
                  establishNewEmptyMovie={this.props.establishNewEmptyMovie}
                  addImageToMovie={this.props.addImageToMovie}
                />
              </div>
            </div>
            <div id='next_button_col' className='col-lg-1'>
              {next_button}
            </div>
          </div>

          <AdvancedImageControls 
            image_url={this.props.image_url}
            mask_method={this.props.mask_method}
            changeMaskMethodCallback={this.props.setMaskMethod}
            getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
            setIllustrateColor={this.props.setIllustrateColor}
            illustrateColor={this.props.illustrateColor}
            getRedactedImageUrl={this.props.getRedactedImageUrl}
          />

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
          onLoad={this.props.setImageScale}
        />
      </div>
    )
  }
}


class AdvancedImageControls extends React.Component {

  buildMaskMethodDropdown() {
    return (
      <select
          name='mask_method'
          value={this.props.mask_method}
          onChange={(event) => this.props.changeMaskMethodCallback(event.target.value)}
      >
        <option value='blur_7x7'>Gaussian Blur 7x7</option>
        <option value='blur_21x21'>Gaussian Blur 21x21</option>
        <option value='blur_median'>Median Blur</option>
        <option value='black_rectangle'>Black Rectangle</option>
        <option value='green_outline'>Green Outline</option>
      </select>
    )
  }

  buildIllustrateColorDropdown() {
    return (
      <select
          name='illustrate_color'
          value={this.props.illustrateColor}
          onChange={(event) => this.props.setIllustrateColor(event.target.value)}
      >
        <option value='#000000'>Black</option>
        <option value='#CCCC00'>Gold</option>
        <option value='#DD0000'>Red</option>
        <option value='#00DD00'>Green</option>
        <option value='#FFFFFF'>White</option>
      </select>
    )
  }

  getImageDimensions() {
    if (!this.props.image_url) {
      return ''
    }
    const img_ele = document.getElementById('base_image_id')
    if (img_ele) {
      return img_ele.naturalWidth.toString() + 'x' + img_ele.naturalHeight.toString() 
    }
  }

  buildRedactedLink() {
    let redacted_link = ''
    if (this.props.getRedactedImageUrl()) {
      let redacted_filename = this.props.getRedactedImageUrl().split('/')
      redacted_link = (
          <div>
            <div 
                className='d-inline'
            >
              Redacted Image:
            </div>
            <div
                className='d-inline ml-2'
            >
              <a
                  href={this.props.getRedactedImageUrl()}
                  download={redacted_filename}
              >
                download
              </a>
            </div>
          </div>
      )
    }
    return redacted_link
  }

  render() {
    if (!this.props.image_url) {
      return ''
    }
    let bottom_y = 100
    const img_ele = document.getElementById('base_image_div')
    if (img_ele) {
      const rect = img_ele.getBoundingClientRect()
      bottom_y = rect['bottom'] - 50
    }
    const controls_style = {
      top: bottom_y,
    }
    const mask_method_dropdown = this.buildMaskMethodDropdown()
    const illustrate_color_dropdown = this.buildIllustrateColorDropdown()
    const dimensions_string = this.getImageDimensions()
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.image_url)
    const redacted_link = this.buildRedactedLink()

    return (
      <div id='bottom_image_controls' className='row' style={controls_style}>

        <div className='col-md-1' />
          <div className='col-md-9 m-2 pb-2 bg-light rounded'>
            <div className='row'>

              <div
                className='col-lg-10 h3 float-left'
              >
                image info
              </div>
              <div
                  className='d-inline float-right'
              >
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#advanced_body'
                    aria-controls='advanced_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
            </div>

            <div
                id='advanced_body'
                className='row collapse'
            >
              <div id='advanced_main' className='col ml-3'>

                <div className='row'>
                <span>Image url:</span>
                <div className='ml-2'>
                  {this.props.image_url}
                </div>
              </div>

              <div className='row'>
                <span>Frameset Hash:</span>
                <div className='ml-2'>
                  {frameset_hash}
                </div>
              </div>

              <div className='row'>
                <span>Dimensions:</span>
                <div className='ml-2'>
                  {dimensions_string}
                </div>
              </div>

              <div className='row'>
                {redacted_link}
              </div>

              <div className='row mt-2'>
                <span>set mask method</span>
                <div className='ml-2'>
                  {mask_method_dropdown}
                </div>
              </div>

              <div className='row mt-2'>
                <span>set illustrate color</span>
                <div className='ml-2'>
                  {illustrate_color_dropdown}
                </div>
              </div>

            </div>
          </div>

      </div>  

      </div>
    )
  }
}

export default ImagePanel;
