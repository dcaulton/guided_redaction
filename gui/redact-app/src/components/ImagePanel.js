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
    this.props.setFramesetHash('')
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
    } else if (job_string === 'scan_ocr') {
      const job_data = this.buildScanOcrJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('ocr scan job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('ocr scan completed')},
        when_failed: () => {this.setMessage('ocr scan failed')},
      })
    } else if (job_string === 'redact') {
      const job_data = this.buildRedactJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('redact job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('redaction completed')},
        when_failed: () => {this.setMessage('redaction failed')},
      })
    } else if (job_string === 'illustrate_box') {
      const job_data = this.buildIllustrateBoxJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('illustrate job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('illustration completed')},
        when_failed: () => {this.setMessage('illustration failed')},
      })
    } else if (job_string === 'illustrate_oval') {
      const job_data = this.buildIllustrateOvalJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('illustrate job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('illustration completed')},
        when_failed: () => {this.setMessage('illustration failed')},
      })
    } 
  }  

  buildScanOcrJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_ocr_image'
    job_data['description'] = 'scan ocr for image'
    job_data['request_data']['movie_url'] = this.props.movie_url
    job_data['request_data']['frameset_hash'] = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    job_data['request_data']['movie'] = this.props.movies[this.props.movie_url]
    job_data['request_data']['image_url'] = this.props.getImageUrl()
    job_data['request_data']['roi_start_x'] = this.state.last_click[0]
    job_data['request_data']['roi_start_y'] = this.state.last_click[1]
    job_data['request_data']['roi_end_x'] = extra_data['current_click'][0]
    job_data['request_data']['roi_end_y'] = extra_data['current_click'][1]
    job_data['request_data']['scan_level'] = 'tier_2'
    const ocr_request_id = 'ocr_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    job_data['request_data']['id'] = ocr_request_id
    return job_data
  }

  buildRedactJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact_single'
    job_data['description'] = 'redact image'
    job_data['request_data']['movie_url'] = this.props.movie_url
    let frameset_hash = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    job_data['request_data']['frameset_hash'] = frameset_hash
    const image_url = this.props.getImageUrl()
    job_data['request_data']['image_url'] = image_url
    // I'd like to use true here, even coded it up.  Had to scrap it because, if we 
    //   rredact, then reset, then redact, the image comes through with the same
    //   url.  That means the system doesn't know to display a new version of the image
    job_data['request_data']['meta'] = {
      preserve_working_dir_across_batch: false,
      working_dir: '',
      return_type: 'url',
    }
    job_data['request_data']['mask_method'] = this.props.mask_method

    let frameset = this.props.movies[this.props.movie_url]['framesets'][frameset_hash]
    let pass_arr = []
    for (let i=0; i < frameset['areas_to_redact'].length; i++) {
      let a2r = frameset['areas_to_redact'][i]
      pass_arr.push(a2r)
    }
    job_data['request_data']['areas_to_redact'] = pass_arr
    return job_data
  }

  buildIllustrateOvalJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'illustrate'
    job_data['description'] = 'illustrate oval'
    job_data['request_data']['movie_url'] = this.props.movie_url
    job_data['request_data']['frameset_hash'] = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    job_data['request_data']['movie'] = this.props.movies[this.props.movie_url]
    job_data['request_data']['image_url'] = this.props.getImageUrl()
    const radius_x = Math.abs(this.state.last_click[0] - this.state.oval_center[0])
    const radius_y = Math.abs(extra_data['second_click'][1] - this.state.oval_center[1])
    const illustration_data = {
      type: 'oval',
      shade_outside: this.state.illustrate_shaded,
      center: this.state.oval_center,
      radius_x: radius_x,
      radius_y: radius_y,
      color: this.props.illustrateParameters['color'],
      line_width: parseInt(this.props.illustrateParameters['lineWidth']),
      background_darken_ratio: parseFloat(this.props.illustrateParameters['backgroundDarkenPercent']),
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
    job_data['request_data']['movie_url'] = this.props.movie_url
    job_data['request_data']['frameset_hash'] = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    job_data['request_data']['movie'] = this.props.movies[this.props.movie_url]
    job_data['request_data']['image_url'] = this.props.getImageUrl()
    let illustration_data = {
      type: 'box',
      shade_outside: this.state.illustrate_shaded,
      start: this.state.last_click,
      end: extra_data['second_click'],
      color: this.props.illustrateParameters['color'],
      line_width: parseInt(this.props.illustrateParameters['lineWidth']),
      background_darken_ratio: parseFloat(this.props.illustrateParameters['backgroundDarkenPercent']),
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
    job_data['request_data']['template_id'] = template['id'] // todo: get rid of this soon
    job_data['request_data']['id'] = template['id']
    job_data['request_data']['scan_level'] = 'tier_2'
    const wrap = {}

    const fake_movie = this.buildCustomOneImageMovie()
    wrap[this.props.movie_url] = fake_movie
    job_data['request_data']['target_movies'] = wrap

    return job_data
  }

  buildCustomOneImageMovie() {
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    let newMovie = {
      framesets: {},
      frames: [],
    }
    newMovie['framesets'][frameset_hash] = this.props.movies[this.props.movie_url]['framesets'][frameset_hash]
    newMovie['frames'].push(this.props.getImageUrl())
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
    if (this.props.getImageUrl() === '') {
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
        source: 'manual',
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
      this.submitImageJob(
        'scan_ocr', 
        {current_click: [x, y]},
      )
      this.setState({
        mode: 'add_1',
        last_click: null,
      })
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

  redactImage()  {
    const areas_to_redact = this.props.getRedactionFromFrameset()
    if (areas_to_redact.length > 0) {
      this.submitImageJob('redact') 
    } else {
      this.setMessage('Nothing to redact has been specified')
    }
  }

  buildGetNextButton() {
    let next_image_link = ''
    let next_image_hash = this.props.getNextImageHash()
    if (next_image_hash) {
      next_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setFramesetHash(next_image_hash)}
        >
          Next
        </button>
      )
    }
    return next_image_link
  }

  buildGetPrevButton() {
    let prev_image_link = ''
    let prev_image_hash = this.props.getPrevImageHash()
    if (prev_image_hash) {
      prev_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setFramesetHash(prev_image_hash)}
        >
          Prev
        </button>
      )
    }
    return prev_image_link
  }
  
  render() {
    let next_button = this.buildGetNextButton()
    let prev_button = this.buildGetPrevButton()
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
                getImageUrl={this.props.getImageUrl}
                setMessage={this.setMessage}
                clearCurrentFramesetChanges={this.props.clearCurrentFramesetChanges}
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
                  getImageUrl={this.props.getImageUrl}
                  image_file={this.props.image_file}
                  setImageScale={this.props.setImageScale}
                />
                <CanvasImageOverlay
                  mode={this.state.mode}
                  submode={this.state.submode}
                  image_width={this.props.image_width}
                  image_height={this.props.image_height}
                  image_scale={this.props.image_scale}
                  getImageUrl={this.props.getImageUrl}
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
            getImageUrl={this.props.getImageUrl}
            mask_method={this.props.mask_method}
            setGlobalStateVar={this.props.setGlobalStateVar}
            getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
            setIllustrateParameters={this.props.setIllustrateParameters}
            illustrateParameters={this.props.illustrateParameters}
          />

        </div>
      </div>
    );
  }
}

class BaseImage extends React.Component {

  render() {
    var the_src = this.props.getImageUrl()
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
          onChange={(event) => this.props.setGlobalStateVar('mask_method', event.target.value)}
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
          value={this.props.illustrateParameters['color']}
          onChange={(event) => this.props.setIllustrateParameters({color: event.target.value})}
      >
        <option value='#000000'>Black</option>
        <option value='#CCCC00'>Gold</option>
        <option value='#DD0000'>Red</option>
        <option value='#00DD00'>Green</option>
        <option value='#FFFFFF'>White</option>
      </select>
    )
  }

  buildIllustrateLineWidthDropdown() {
    return (
      <select
          name='illustrate_line_width'
          value={this.props.illustrateParameters['lineWidth']}
          onChange={(event) => this.props.setIllustrateParameters({lineWidth: event.target.value})}
      >
        <option value='1'>1px</option>
        <option value='2'>2px</option>
        <option value='3'>3px</option>
        <option value='5'>5px</option>
        <option value='10'>10px</option>
        <option value='20'>20px</option>
      </select>
    )
  }

  buildIllustrateDarkenPercentDropdown() {
    return (
      <select
          name='illustrate_darken_percent'
          value={this.props.illustrateParameters['backgroundDarkenPercent']}
          onChange={(event) => this.props.setIllustrateParameters({backgroundDarkenPercent: event.target.value})}
      >
        <option value='.1'>10%</option>
        <option value='.2'>20%</option>
        <option value='.3'>30%</option>
        <option value='.5'>50%</option>
        <option value='.75'>75%</option>
        <option value='1'>100%</option>
      </select>
    )
  }

  getImageDimensions() {
    if (!this.props.getImageUrl()) {
      return ''
    }
    const img_ele = document.getElementById('base_image_id')
    if (img_ele) {
      return img_ele.naturalWidth.toString() + 'x' + img_ele.naturalHeight.toString() 
    }
  }

  buildDownloadLink() {
    let download_link = ''
    let download_filename = this.props.getImageUrl().split('/')
    download_link = (
      <div>
        <div 
            className='d-inline'
        >
          Download Image:
        </div>
        <div
            className='d-inline ml-2'
        >
          <a
              href={this.props.getImageUrl()}
              download={download_filename}
          >
            download
          </a>
        </div>
      </div>
    )
    return download_link
  }

  render() {
    if (!this.props.getImageUrl()) {
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
    const illustrate_darken_dropdown = this.buildIllustrateDarkenPercentDropdown()
    const illustrate_line_width_dropdown = this.buildIllustrateLineWidthDropdown()
    const dimensions_string = this.getImageDimensions()
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    const download_link = this.buildDownloadLink()
    const image_url = this.props.getImageUrl()

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
                  {image_url}
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
                {download_link}
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

              <div className='row mt-2'>
                <span>set illustrate line width</span>
                <div className='ml-2'>
                  {illustrate_line_width_dropdown}
                </div>
              </div>

              <div className='row mt-2'>
                <span>set illustrate background darken percent</span>
                <div className='ml-2'>
                  {illustrate_darken_dropdown}
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
