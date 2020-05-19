import React from 'react'
import CanvasImageOverlay from './CanvasImageOverlay'
import {getMessage, getDisplayMode} from './redact_utils.js'

class ImagePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: '',
      submode: null,
      display_mode: '',
      message: '',
      last_click: null,
      oval_center: null,
      illustrate_shaded: false,
    }
    this.button_style = {
      borderColor: 'black',
    }
    this.setMessage=this.setMessage.bind(this)
    this.redactImage=this.redactImage.bind(this)
    this.submitImageJob=this.submitImageJob.bind(this)
    this.setIllustrateShaded=this.setIllustrateShaded.bind(this)
    this.newImage=this.newImage.bind(this)
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
      const job_data = this.buildOcrJobdata(extra_data)
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
    } else if (job_string === 'template_match_all_templates') {
      const job_data = this.buildTemplateMatchJobdata({scope: 'all_templates'})
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('template match job was submitted')}, 
        cancel_after_loading: true, 
        after_loaded: () => {this.setMessage('template match completed')},
        when_failed: () => {this.setMessage('template match failed')},
      })
    } 
  }  

  buildSingleUseOcrRule(last_click, current_click) {
    let ocr_rule = {}
    ocr_rule['id'] = 'ocr_rule_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    ocr_rule['name'] = 'single use'
    ocr_rule['start'] = last_click
    ocr_rule['end'] = current_click
    ocr_rule['image'] = ''
    ocr_rule['movie'] = ''
    ocr_rule['match_text'] = []
    ocr_rule['match_percent'] = 0
    ocr_rule['skip_east'] = false
    ocr_rule['scan_level'] = 'tier_2'
    ocr_rule['origin_entity_location'] = [0, 0]
    return ocr_rule
  }

  buildMoviesForSingleFrame() {
    const image_url = this.props.getImageUrl()
    const frameset_hash = this.props.getFramesetHashForImageUrl(image_url)
    let movies = {}
    movies[this.props.movie_url] = {framesets: {}}
    movies[this.props.movie_url]['framesets'][frameset_hash] = {images: []}
    movies[this.props.movie_url]['framesets'][frameset_hash]['images'].push(image_url)
    return movies
  }

  buildOcrJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    const ocr_rule = this.buildSingleUseOcrRule(this.state.last_click, extra_data['current_click'])
    let ocr_rules = {}
    ocr_rules[ocr_rule['id']] = ocr_rule
    const movies = this.buildMoviesForSingleFrame()
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_ocr'
    job_data['description'] = 'scan ocr for Image Panel'
    job_data['request_data']['movies'] = movies
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners']['ocr'] = ocr_rules
    job_data['request_data']['scan_level'] = 'tier_2'
    job_data['request_data']['id'] = ocr_rule['id']
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
    let templates_wrap = {}
    if (extra_data['scope'] === 'all_templates') {
      job_data['operation'] = 'scan_template_multi'
      job_data['description'] = 'multiple templates single image match from ImagePanel: '
      job_data['description'] += 'image ' + this.props.getImageUrl()
      templates_wrap = this.props.templates
      const temp_group_id = 'template_group_' + Math.floor(Math.random(10000, 99999)*100000).toString()
      job_data['request_data']['id'] = temp_group_id
    } else {
      job_data['operation'] = 'scan_template'
      job_data['description'] = 'single template single image match from ImagePanel: '
      job_data['description'] += 'image ' + this.props.getImageUrl()
      templates_wrap[extra_data] = this.props.templates[extra_data]
      job_data['request_data']['id'] = extra_data
      job_data['request_data']['template_id'] = extra_data
    }
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners']['template'] = templates_wrap
    job_data['request_data']['scan_level'] = 'tier_2'
    const movies_wrap = {}

    const fake_movie = this.buildCustomOneImageMovie()
    movies_wrap[this.props.movie_url] = fake_movie
    job_data['request_data']['movies'] = movies_wrap

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
    const next_image_hash = this.props.getNextImageHash()
    const next_text = '>>'
    if (next_image_hash) {
      next_image_link = (
        <button
          className='btn btn-light'
          style={this.button_style}
          onClick={() => this.props.setFramesetHash(next_image_hash)}
        >
          {next_text}
        </button>
      )
    }
    return next_image_link
  }

  buildGetPrevButton() {
    let prev_image_link = ''
    const prev_image_hash = this.props.getPrevImageHash()
    const prev_text = '<<'
    if (prev_image_hash) {
      prev_image_link = (
        <button
          className='btn btn-light'
          style={this.button_style}
          onClick={() => this.props.setFramesetHash(prev_image_hash)}
        >
          {prev_text}
        </button>
      )
    }
    return prev_image_link
  }
  
  buildPrecisionLearningLink() {
    return (
      <div>
        <button
            className='btn btn-link font-weight-bold'
        >
          Go to Precision Learning
        </button>
      </div>
    )
  }

  buildWhenDoneLink() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    if (this.props.whenDoneTarget) {
      return (
        <button 
            className='btn btn-link font-weight-bold'  
            onClick={() => this.props.gotoWhenDoneTarget()}
        >
          Go to Precision Learning 
        </button>
      )
    }
  }

  buildHeaderRow() {
    const pl_link = this.buildPrecisionLearningLink()
    let pl_link_header_style = {
        height: '50px',
    }
    return (
      <div 
          id='image_header_row'
          className='row mt-3'
      >
        <div 
            id='precision_learning_link_container'
            className='col-lg-3'
            style={pl_link_header_style}
        >
          {pl_link}
        </div>
      </div>
    )
  }

  render() {
    let next_button = this.buildGetNextButton()
    let prev_button = this.buildGetPrevButton()
    let header_row = this.buildHeaderRow()
    var img_src = this.props.getImageUrl()

    return (
      <div id='image_panel_container'
          className='col-lg-12'
      >
        {header_row}
        <div className='row'>
          <div 
              className='col-lg-6'
          >
              <div 
                  id='ip_image_and_canvas'
                  className='row'
              >
                <div id='base_image_div'>
                  <img id='base_image_id' 
                    alt={img_src}
                    src={img_src}
                    onLoad={this.props.setImageScale}
                  />
                </div>
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

              <div className='row pt-2 border-bottom p-2 bg-light'>
                <div className='col-lg-1'>
                  {prev_button}
                </div>

                <div className='col-lg-10 text-center'>
                  <div className='row ml-2 font-weight-bold'>
                    {this.state.display_mode}
                  </div>
                  <div className='row ml-2'>
                    {this.state.message}
                  </div>
                </div>

                <div className='col-lg-1'>
                  {next_button}
                </div>
              </div>

              <BottomImageControls 
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
                submitImageJob={this.submitImageJob}
                setIllustrateShaded={this.setIllustrateShaded}
                newImage={this.newImage}
              />

          </div>

          <div className='col-lg-6'>
            <div className='row'>
              <div className='col-lg-12'>
                <ImageInfoControls 
                  getImageUrl={this.props.getImageUrl}
                  mask_method={this.props.mask_method}
                  setGlobalStateVar={this.props.setGlobalStateVar}
                  getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
                  setIllustrateParameters={this.props.setIllustrateParameters}
                  illustrateParameters={this.props.illustrateParameters}
                />
              </div>
            </div>

            <div className='row mt-2'>
              <div className='col-lg-12'>
                <TemplateBuilderControls 
                  getImageUrl={this.props.getImageUrl}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
}


class TemplateBuilderControls extends React.Component {
  render() {
    if (!this.props.getImageUrl()) {
      return ''
    }
    return (
      <div>

        <div className='col bg-light rounded border'>
          <div className='row'>

            <div
              className='col-lg-11 h3 float-left ml-2 mt-2'
            >
              Templates
            </div>
            <div
                className='d-inline float-right'
            >
              <button
                  className='btn btn-link'
                  aria-expanded='false'
                  data-target='#template_builder_body'
                  aria-controls='template_builder_body'
                  data-toggle='collapse'
                  type='button'
              >
                +/-
              </button>
            </div>
          </div>

          <div
              id='template_builder_body'
              className='row collapse border-top m-2'
          >

            <div className='col mb-3'>
              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Add minimal template creation tool here
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

class ImageInfoControls extends React.Component {

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
    const mask_method_dropdown = this.buildMaskMethodDropdown()
    const illustrate_color_dropdown = this.buildIllustrateColorDropdown()
    const illustrate_darken_dropdown = this.buildIllustrateDarkenPercentDropdown()
    const illustrate_line_width_dropdown = this.buildIllustrateLineWidthDropdown()
    const dimensions_string = this.getImageDimensions()
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.getImageUrl())
    const download_link = this.buildDownloadLink()
    const image_url = this.props.getImageUrl()

    return (
      <div>

        <div className='col bg-light rounded border'>
          <div className='row'>
            <div
              className='col h3 float-left ml-2 mt-2'
            >
              Image Info
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
              className='row collapse border-top ml-2 mr-2'
          >

            <div id='advanced_main' className='col mb-3'>
              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Image Url:
                </div>
                <div className='d-inline ml-2'>
                  {image_url}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Frameset Hash:
                </div>
                <div className='d-inline ml-2'>
                  {frameset_hash}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Dimensions:
                </div>
                <div className='d-inline ml-2'>
                  {dimensions_string}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Download Image:
                </div>
                <div className='d-inline ml-2'>
                  {download_link}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Set Mask Method:
                </div>
                <div className='d-inline ml-2'>
                  {mask_method_dropdown}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Set Illustrate Color:
                </div>
                <div className='d-inline ml-2'>
                  {illustrate_color_dropdown}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Set Illustrate Line Width:
                </div>
                <div className='d-inline ml-2'>
                  {illustrate_line_width_dropdown}
                </div>
              </div>

              <div className='row mt-2'>
                <div className='d-inline font-weight-bold'>
                  Set Illustrate Background Darken Percent:
                </div>
                <div className='d-inline ml-2'>
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

class BottomImageControls extends React.Component {
  constructor(props) {
    super(props)
    this.button_style = {
      borderColor: 'black',
    }
  }

  resetImage() {
    this.props.clearCurrentFramesetChanges(this.props.setMessage('image has been reset'))
  }

  buildTemplateButton() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    const template_keys = Object.keys(this.props.templates)
    if (!template_keys.length) {
      return ''
    }
    return (
      <div id='template_div' className='d-inline'>
        <button 
            className='btn btn-light dropdown-toggle ml-2' 
            style={this.button_style}
            type='button' 
            id='templateDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Template
        </button>
        <div className='dropdown-menu' aria-labelledby='tempateDropdownButton'>
          {template_keys.map((value, index) => {
            return (
              <button className='dropdown-item'
                  key={index}
                  onClick={() => this.props.submitImageJob('template_match', this.props.templates[value]['id'])}
                  href='.'
              >
                Run {this.props.templates[value]['name']}
              </button>
            )
          })}
          <button className='dropdown-item'
              key='template_all'
              onClick={() => this.props.submitImageJob('template_match_all_templates')}
              href='.'
          >
            Run All
          </button>
        </div>
      </div>
    )
  }

  buildAddButton() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    return (
      <div id='add_div' className='d-inline'>
        <button 
            className='btn btn-light dropdown-toggle' 
            style={this.button_style}
            type='button' 
            id='addDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Add
        </button>
        <div 
            className='dropdown-menu' 
            aria-labelledby='addDropdownButton'
        >
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('add_1', 'box')}
          >
            Box
            {this.props.debuginfo}
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('add_1', 'ocr')} 
              href='.'
          >
            OCR
          </button>
        </div>
      </div>
    )
  }

  buildDeleteButton() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    return (
      <div id='delete_div' className='d-inline'>
        <button 
            className='btn btn-light dropdown-toggle ml-2' 
            style={this.button_style}
            type='button' 
            id='deleteDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Delete
        </button>
        <div 
            className='dropdown-menu' 
            aria-labelledby='deleteDropdownButton'
        >
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('delete', 'item')} 
              href='.'
          >
            Item
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('delete_1', 'box_all')} 
              href='.'
          >
            Box (all in)
          </button>
        </div>
      </div>
    )
  }

  buildRedactButton() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    return (
      <button 
          className='btn btn-primary ml-2'  
          onClick={() => this.props.redactImage()}
          href='./index.html' >
        Redact
      </button>
    )
  }

  buildNewImageButton() {
    return (
      <button 
          className='btn btn-light ml-2'  
          style={this.button_style}
          onClick={() => this.props.newImage()}
          href='./index.html' >
        New
      </button>
    )
  }

  buildResetButton() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    return (
      <button 
          className='btn btn-light ml-2' 
          onClick={() => this.resetImage()}
          style={this.button_style}
          href='./index.html' >
        Reset
      </button>
    )
  }

  illustrateShadedOvalOne() {
    this.props.setIllustrateShaded('true')
    this.props.setMode('illustrate', 'ill_oval_1')
  }

  illustrateShadedBoxOne() {
    this.props.setIllustrateShaded('true')
    this.props.setMode('illustrate', 'ill_box_1')
  }

  buildIllustrateButton() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    return (
      <div id='illustrate_div' className='d-inline'>
        <button 
            className='btn btn-light dropdown-toggle ml-2' 
            style={this.button_style}
            type='button' 
            id='illustrateDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Illustrate
        </button>
        <div className='dropdown-menu' aria-labelledby='illustrateDropdownButton'>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate', 'ill_oval_1')} 
              href='.'
          >
            Oval
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.illustrateShadedOvalOne()} 
              href='.'
          >
            Oval - shaded background
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate', 'ill_box_1')} 
              href='.'
          >
            Box
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.illustrateShadedBoxOne()} 
              href='.'
          >
            Box - shaded background
          </button>
        </div>
      </div>
    )
  }

  render() {
    const template_button = this.buildTemplateButton()
    const add_button = this.buildAddButton()
    const delete_button = this.buildDeleteButton()
    const redact_button = this.buildRedactButton()
    const reset_button = this.buildResetButton()
    const illustrate_button = this.buildIllustrateButton()
    const new_image_button = this.buildNewImageButton()

    return (
    <div className='row pt-2 pb-2 bg-light rounded border-bottom border-left border-right'>
        <div className='col-lg-10'>
          {add_button}

          {delete_button} 

          {template_button}

          {illustrate_button}

          {new_image_button}

          {reset_button}
        </div>

        <div className='col-lg-2 float-right'>
          {redact_button}
        </div>
    </div>
    );
  }
}

export default ImagePanel
