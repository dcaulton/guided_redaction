import React from 'react'
import CanvasImageOverlay from './CanvasImageOverlay'
import {getMessage, getDisplayMode} from './redact_utils.js'
import {
  buildLabelAndTextInput,
  buildInlinePrimaryButton,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildIdString,
  doTier1Save,
} from './SharedControls'

class ImagePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: '',
      submode: null,
      display_mode: '',
      last_click: null,
      oval_center: null,
      illustrate_shaded: false,
      callbacks: {},
    }
    this.button_style = {
      borderColor: 'black',
    }
    this.setMessage=this.setMessage.bind(this)
    this.redactImage=this.redactImage.bind(this)
    this.submitImageJob=this.submitImageJob.bind(this)
    this.setIllustrateShaded=this.setIllustrateShaded.bind(this)
    this.newImage=this.newImage.bind(this)
    this.addImageCallback=this.addImageCallback.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
  }

  getCurrentTemplateMaskZones() {
    const template_id = this.props.tier_1_scanner_current_ids['template']
    const template = this.props.tier_1_scanners['template'][template_id]
    if (template) {
      return template['mask_zones']
    }
    return []
  }

  getCurrentTemplateAnchors() {
    const template_id = this.props.tier_1_scanner_current_ids['template']
    const template = this.props.tier_1_scanners['template'][template_id]
    if (template) {
      return template['anchors']
    }
    return []
  }

  currentImageIsTemplateAnchorImage() {
    if (this.props.tier_1_scanner_current_ids['template']) {
      let key = this.props.tier_1_scanner_current_ids['template']
      if (!Object.keys(this.props.tier_1_scanners['template']).includes(key)) {
        return false
      }
      let template = this.props.tier_1_scanners['template'][key]
      if (!Object.keys(template).includes('anchors')) {
        return false
      }
      if (!template['anchors'].length && !template['mask_zones'].length) {
        return false
      }
      if (!template['anchors'].length) { 
        // all we have are mask zones, be generous, at this point any image
        // could be our 'anchor image'.  Though it doesn't make much sense to 
        // have any permanently saved template whith mask zones but no anchors,
        // it makes the interface more humane to the casual user
        return true
      }
      let cur_template_anchor_image_name = template['anchors'][0]['image']
      return (cur_template_anchor_image_name === this.props.getImageUrl())
    } else {
      return true
    }
  }

  addImageCallback(the_key, the_callback) {
    let new_callbacks = this.state.callbacks
    new_callbacks[the_key] = the_callback
    this.setState({
      callbacks: new_callbacks,
    })
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
      templates_wrap = this.props.tier_1_scanners['template']
      const temp_group_id = 'template_group_' + Math.floor(Math.random(10000, 99999)*100000).toString()
      job_data['request_data']['id'] = temp_group_id
    } else {
      job_data['operation'] = 'scan_template'
      job_data['description'] = 'single template single image match from ImagePanel: '
      job_data['description'] += 'image ' + this.props.getImageUrl()
      templates_wrap[extra_data] = this.props.tier_1_scanners['template'][extra_data]
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
    this.props.setGlobalStateVar('message', the_message)
  }

  setMode = (mode='', submode='') => {
    const message = getMessage(mode, submode);
    const display_mode = getDisplayMode(mode, submode);
    this.setMessage(message)
    this.setState({
      mode: mode,
      submode: submode,
      display_mode: display_mode,
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
    this.setState({
      last_click: [x_scaled, y_scaled],
    })

    if (this.state.mode === 'add_1') {
      this.setState({
        mode: 'add_2',
      })
      this.setMessage(getMessage('add_2', this.state.submode))

    } else if (Object.keys(this.state.callbacks).includes(this.state.mode)) {
      this.state.callbacks[this.state.mode]([x_scaled, y_scaled])
    } else if (this.state.mode === 'add_template_anchor_1') {
      this.setMode('add_template_anchor_2')
    } else if (this.state.mode === 'add_template_mask_zone_1') {
      this.setMode('add_template_mask_zone_2')
    } else if (this.state.mode === 'add_2') {
      this.handleAddSecond(x_scaled, y_scaled)
    } else if (this.state.mode === 'delete') {
      this.handleDelete(x_scaled, y_scaled)
    } else if (this.state.mode === 'delete_1') {
      this.setState({
        mode: 'delete_2',
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
      })
      this.setMessage(getMessage('illustrate', 'ill_oval_3'))
    } else if (this.state.submode=== 'ill_oval_3') {
      this.handleIllustrateOvalFinal(x_scaled, y_scaled)
    } else if (this.state.submode === 'ill_box_1') {
      this.setState({
        submode: 'ill_box_2',
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
    if (this.props.getImageUrl() === '') {
      return ''
    }
    if (this.props.whenDoneTarget) {
      return (
        <div>
          <button
              className='btn btn-link font-weight-bold'
              onClick={() => this.props.gotoWhenDoneTarget()}
          >
            Go to Precision Learning
          </button>
        </div>
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

  buildTitleNextPrev() {
    if (this.props.getImageUrl() === '') {
      return ''
    }
    let next_button = this.buildGetNextButton()
    let prev_button = this.buildGetPrevButton()
    let tnp_style = {
      'minHeight': '60px',
    }
    return (
      <div 
          className='row pt-2 border-bottom p-2 bg-light'
          style={tnp_style}
      >
        <div className='col-lg-1'>
          {prev_button}
        </div>

        <div className='col-lg-10 text-center'>
          <div className='row ml-2 font-weight-bold'>
            {this.state.display_mode}
          </div>
          <div className='row ml-2'>
            {this.props.message}
          </div>
        </div>

        <div className='col-lg-1'>
          {next_button}
        </div>
      </div>
    )
  }

  render() {
    let header_row = this.buildHeaderRow()
    let img_src = this.props.getImageUrl()
    const title_next_prev = this.buildTitleNextPrev()
    let imageDivStyle= {
      width: this.props.image_width,
    }

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
                <div 
                    id='base_image_div'
                    style={imageDivStyle}
                >
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
                  currentImageIsTemplateAnchorImage={this.currentImageIsTemplateAnchorImage}
                  getCurrentTemplateMaskZones={this.getCurrentTemplateMaskZones}
                  getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
                />
              </div>

              {title_next_prev}

              <BottomImageControls 
                mode={this.state.mode}
                templates={this.props.tier_1_scanners['template']}
                display_mode={this.state.display_mode}
                submode={this.state.submode}
                message={this.props.message}
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
                  getAndSaveUser={this.props.getAndSaveUser}
                  tier_1_scanners={this.props.tier_1_scanners}
                  tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
                  setGlobalStateVar={this.props.setGlobalStateVar}
                  cropImage={this.props.cropImage}
                  setMessage={this.setMessage}
                  setMode={this.setMode}
                  addImageCallback={this.addImageCallback}
                  last_click={this.state.last_click}
                  movie_url={this.props.movie_url}
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

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      scale: '1_1',
      match_percent: 90,
      match_method: 'any',
      scan_level: 'tier_2',
      anchors: [],
      mask_zones: [],
      download_link: '',
      unsaved_changes: false,
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.getTemplateFromState=this.getTemplateFromState.bind(this)
    this.addAnchorCallback=this.addAnchorCallback.bind(this)
    this.addMaskZoneCallback=this.addMaskZoneCallback.bind(this)
    this.anchorSliceDone=this.anchorSliceDone.bind(this)
  }

  componentDidMount() {
    this.loadNewTemplate()
    this.props.getAndSaveUser()
    this.props.addImageCallback('add_template_anchor_2', this.addAnchorCallback)
    this.props.addImageCallback('add_template_mask_zone_2', this.addMaskZoneCallback)
  }

  addMaskZoneCallback(end_coords) {
    const start_coords = this.props.last_click
    const mask_zone_id = 'mask_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const image_url = this.props.getImageUrl()
    const the_mask_zone = {
        'id': mask_zone_id,
        'start': start_coords,
        'end': end_coords,
        'image': image_url,
        'movie': this.props.movie_url,
    }
    let deepCopyMaskZones = JSON.parse(JSON.stringify(this.state.mask_zones))
    deepCopyMaskZones.push(the_mask_zone)
    this.setState({
      mask_zones: deepCopyMaskZones,
      unsaved_changes: true,
    })
    this.doSave()
    this.props.setMode('add_template_mask_zone_1')
  }

  addAnchorCallback(end_coords) {
    const start_coords = this.props.last_click
    const anchor_id = 'anchor_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const image_url = this.props.getImageUrl()
    const the_anchor = {
        'id': anchor_id,
        'start': start_coords,
        'end': end_coords,
        'image': image_url,
        'movie': this.props.movie_url,
    }
    let deepCopyAnchors = JSON.parse(JSON.stringify(this.state.anchors))
    deepCopyAnchors.push(the_anchor)
    this.setState({
      anchors: deepCopyAnchors,
      unsaved_changes: true,
    },
    (() => {this.exportCurrentAnchors()}),
    )
    this.props.setMode('view')
    this.props.setMessage('anchor was successfully added')
  }

  loadNewTemplate() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['template'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    const the_id = 'template_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      attributes: {},
      scale: '1_1',
      match_percent: 90,
      match_method: 'any',
      scan_level: 'tier_2',
      anchors: [],
      mask_zones: [],
      download_link: '',
      unsaved_changes: false,
    })
  }

  loadTemplate(template_id) {
    if (!template_id) {
      this.loadNewTemplate()
    } else {
      const template = this.props.tier_1_scanners['template'][template_id]
      this.setState({
        id: template_id,
        name: template['name'],
        attributes: template['attributes'],
        scale: template['scale'],
        match_percent: template['match_percent'],
        match_method: template['match_method'],
        scan_level: template['scan_level'],
        anchors: template['anchors'],
        mask_zones: template['mask_zones'],
        download_link: '',
        unsaved_changes: false,
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['template'] = template_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'mini_template_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  getTemplateFromState() {
    const template = {
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      scale: this.state.scale,
      match_percent: this.state.match_percent,
      match_method: this.state.match_method,
      scan_level: this.state.scan_level,
      anchors: this.state.anchors,
      mask_zones: this.state.mask_zones,
    }
    return template
  }

  async exportCurrentAnchors() {
    for (let i=0; i < this.state.anchors.length; i++) {
      let the_anchor = this.state.anchors[i]
      let resp = this.props.cropImage(
        the_anchor['image'],
        the_anchor['start'],
        the_anchor['end'],
        the_anchor['id'],
        this.anchorSliceDone
      )
      await resp
    }
  }

  async anchorSliceDone(response) {                                             
    const anchor_id = response['anchor_id']                                     
    const cropped_image_bytes = response['cropped_image_bytes']                 
    let deepCopyAnchors = JSON.parse(JSON.stringify(this.state.anchors))        
    let something_changed = false                                               
    for (let i=0; i < deepCopyAnchors.length; i++) {                            
      let anchor = deepCopyAnchors[i]                                           
      if (anchor['id'] === anchor_id) {                                         
        if (Object.keys(anchor).includes('cropped_image_bytes')) {              
          if (anchor['cropped_image_bytes'] === cropped_image_bytes) {          
            continue                                                            
          } else {                                                              
            anchor['cropped_image_bytes'] = cropped_image_bytes                 
            something_changed = true                                            
          }                                                                     
        } else {                                                                
          anchor['cropped_image_bytes'] = cropped_image_bytes                   
          something_changed = true                                              
        }                                                                       
      }                                                                         
    }                                                                           
    if (something_changed) {                                                    
      this.setState({                                                           
        anchors: deepCopyAnchors,                                               
        unsaved_changes: true,                                                  
      })                                                                        
      this.doSave()
    } 
  }

  async doSave(when_done=(()=>{})) {
    let eca_response = this.exportCurrentAnchors()
    .then(() => {
      const template = doTier1Save(
        'template',
        this.getTemplateFromState,
        this.props.setMessage,
        this.props.tier_1_scanners,
        this.props.tier_1_scanner_current_ids,
        this.props.setGlobalStateVar,
      )
      return template
    })
    .then((template) => {
      this.setState({
        unsaved_changes: false,
      })
      when_done(template)
    })
    await eca_response
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'template',
      this.props.tier_1_scanners['template'],
      ((value)=>{this.loadTemplate(value)})
    )
  }

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
    )
  }

  deleteTemplate(template_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyTemplates = deepCopyScanners['template']
    delete deepCopyTemplates[template_id]
    deepCopyScanners['template'] = deepCopyTemplates
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (template_id === this.props.tier_1_scanner_current_ids['template']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['template'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    setTimeout((() => {this.props.setGlobalStateVar('message', 'Template was deleted')}), 500)
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'template',
      this.props.tier_1_scanners['template'],
      ((value)=>{this.deleteTemplate(value)})
    )
  }

  buildAddAnchorButton() {
    if (this.state.anchors.length) {
      return ''
    }
    return buildInlinePrimaryButton(
      'Add Anchor',
      (()=>{this.addTemplateAnchor()})
    )
  }

  buildAddMaskZoneButton() {
    return buildInlinePrimaryButton(
      'Add Mask Zone',
      (()=>{this.addTemplateMaskZone()})
    )
  }

  addTemplateAnchor() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.setMode('add_template_anchor_1')
  }

  addTemplateMaskZone() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.setMode('add_template_mask_zone_1')
  }

  deleteAnchor(anchor_id) {
    let new_anchors = []
    for (let i=0; i < this.state.anchors.length; i++) {
      const anchor = this.state.anchors[i]
      if (anchor['id'] !== anchor_id) {
        new_anchors.push(anchor)
      }
    }
    this.setState({
      anchors: new_anchors,
    })
    this.doSave()
  }

  buildAnchorPics() {
    if (!this.state.anchors.length) {
      return (
        <div
            className='font-italic'
        >
          (none)
        </div>
      )
    }
    let return_arr = []
    let anchor_images = []
    for (let i=0; i < this.state.anchors.length; i++) {
      let anchor = this.state.anchors[i]
      if (Object.keys(anchor).includes('cropped_image_bytes')) {
        anchor_images[anchor['id']] = anchor['cropped_image_bytes']
      }
    }
    for (let i=0; i < Object.keys(anchor_images).length; i++) {
      const anchor_id = Object.keys(anchor_images)[i]
      const the_src = "data:image/gif;base64," + anchor_images[anchor_id]
      return_arr.push(
        <div
          key={'hey' + i}
          className='p-2 border-bottom'
        >
          <div className='d-inline'>
            <div className='d-inline'>
              id:
            </div>
            <div className='d-inline ml-2'>
              {anchor_id}
            </div>
          </div>
          <div className='d-inline ml-2'>
            <img
              max-height='100'
              max-width='100'
              key={'dapper' + i}
              alt={anchor_id}
              title={anchor_id}
              src={the_src}
            />
          </div>
          <div className='d-inline ml-2'>
            <button
                className='btn btn-link'
                onClick={() => this.deleteAnchor(anchor_id)}
            >
              delete
            </button>
          </div>
        </div>
      )
    }
    return return_arr
  }

  render() {
    if (!this.props.getImageUrl()) {
      return ''
    }
    const name_field = this.buildNameField()
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const add_anchor_button = this.buildAddAnchorButton()
    const add_mask_zone_button = this.buildAddMaskZoneButton()
    const anchor_list = this.buildAnchorPics()
    const id_string = buildIdString(this.state.id, 'template', this.state.unsaved_changes)

    return (
      <div>

        <div className='col bg-light rounded border'>
          <div className='row'>

            <div
              className='col-lg-11 h3 float-left ml-2 mt-2'
            >
              Manage Templates
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
                {load_button}
                {save_button}
                {delete_button}
                {add_anchor_button}
                {add_mask_zone_button}
              </div>

              <div className='row mt-2'>
                {id_string}
              </div>

              <div className='row mt-2'>
                {name_field}
              </div>

              <div className='row mt-2'>
                <div className='col-lg-12 h5 border-top border-bottom p-4'>
                  Anchors
                </div>
                <div className='col-lg-12'>
                  {anchor_list}
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
    const download_link = this.buildDownloadLink()

    return (
      <div>

        <div className='col bg-light rounded border'>
          <div className='row'>
            <div
              className='col-lg-11 h3 float-left ml-2 mt-2'
            >
              Redaction Options
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
    const image_url = this.props.getImageUrl()
    if (image_url === '') {
      return ''
    }
    if (image_url.indexOf('redacted') === -1) {
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
    if (this.props.getImageUrl() === '') {
      return ''
    }
    const template_button = this.buildTemplateButton()
    const add_button = this.buildAddButton()
    const delete_button = this.buildDeleteButton()
    const redact_button = this.buildRedactButton()
    const reset_button = this.buildResetButton()
    const illustrate_button = this.buildIllustrateButton()

    return (
    <div className='row pt-2 pb-2 bg-light rounded border-bottom border-left border-right'>
        <div className='col-lg-10'>
          {add_button}
          {delete_button} 
          {template_button}
          {reset_button}
          {illustrate_button}
        </div>

        <div className='col-lg-2 float-right'>
          {redact_button}
        </div>
    </div>
    );
  }
}

export default ImagePanel
