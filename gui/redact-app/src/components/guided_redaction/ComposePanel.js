import React from 'react'
import {
  getMessage
} from './redact_utils.js'
import CanvasComposeOverlay from './CanvasComposeOverlay'
import Workflows from './Workflows'
import JobBug from './JobBug'
import ComposeImageControls from './ComposeImageControls'
import ComposeImageInfoControls from './ComposeImageInfoControls'
import SimpleTemplateBuilderControls from './SimpleTemplateBuilderControls'

class ComposePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      compose_image: '',
      compose_display_image: '',
      last_click: null,
      oval_center: null,
      movie_offset_string: '',
      dragged_type: '',
      dragged_id: '',
      mode: '', 
      callbacks: {},
      displayFetchRecordingId: true,
      displayCaptureButton: true,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: false,
      displayImageControls: false, // I think this one can go away, let's see 
      displayIllustrateControls: false,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    }
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.removeSequenceFrame=this.removeSequenceFrame.bind(this)
    this.setDraggedItem=this.setDraggedItem.bind(this)
    this.handleDroppedOntoSubsequence=this.handleDroppedOntoSubsequence.bind(this)
    this.handleDroppedOntoSequence=this.handleDroppedOntoSequence.bind(this)
    this.moveSequenceFrameUp=this.moveSequenceFrameUp.bind(this)
    this.moveSequenceFrameDown=this.moveSequenceFrameDown.bind(this)
    this.generateSubsequence=this.generateSubsequence.bind(this)
    this.templatesExist=this.templatesExist.bind(this)
    this.sequenceImagesExist=this.sequenceImagesExist.bind(this)
    this.redactedSequenceImagesExist=this.redactedSequenceImagesExist.bind(this)
    this.illustratedSequenceImagesExist=this.illustratedSequenceImagesExist.bind(this)
    this.animatedSequenceImagesExist=this.animatedSequenceImagesExist.bind(this)
    this.activateSequenceMovie=this.activateSequenceMovie.bind(this)
    this.activateSourceMovie=this.activateSourceMovie.bind(this)
    this.movieHasBeenLoaded=this.movieHasBeenLoaded.bind(this)
    this.sequenceFramesHaveBeenGrabbed=this.sequenceFramesHaveBeenGrabbed.bind(this)
    this.startLoadMovie=this.startLoadMovie.bind(this)
    this.startCaptureImages=this.startCaptureImages.bind(this)
    this.startRedact=this.startRedact.bind(this)
    this.startBuildTemplates=this.startBuildTemplates.bind(this)
    this.startScanTemplates=this.startScanTemplates.bind(this)
    this.startIllustrate=this.startIllustrate.bind(this)
    this.startAnimate=this.startAnimate.bind(this)
    this.startPrecisionLearning=this.startPrecisionLearning.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.setMode=this.setMode.bind(this)
    this.redactImage=this.redactImage.bind(this)
    this.addCallback=this.addCallback.bind(this)
    this.do_add_1_box=this.do_add_1_box.bind(this)
    this.do_add_2_box=this.do_add_2_box.bind(this)
    this.do_add_1_ocr=this.do_add_1_ocr.bind(this)
    this.do_add_2_ocr=this.do_add_2_ocr.bind(this)
    this.do_illustrate_box_1=this.do_illustrate_box_1.bind(this)
    this.do_illustrate_box_shaded_1=this.do_illustrate_box_shaded_1.bind(this)
    this.do_illustrate_box_2=this.do_illustrate_box_2.bind(this)
    this.do_illustrate_box_shaded_2=this.do_illustrate_box_shaded_2.bind(this)
    this.do_illustrate_oval_1=this.do_illustrate_oval_1.bind(this)
    this.do_illustrate_oval_shaded_1=this.do_illustrate_oval_shaded_1.bind(this)
    this.do_illustrate_oval_2=this.do_illustrate_oval_2.bind(this)
    this.do_illustrate_oval_shaded_2=this.do_illustrate_oval_shaded_2.bind(this)
    this.do_illustrate_oval_3=this.do_illustrate_oval_3.bind(this)
    this.do_illustrate_oval_shaded_3=this.do_illustrate_oval_shaded_3.bind(this)
    this.handleImageClick=this.handleImageClick.bind(this)
    this.getRedactionsFromCurrentFrameset=this.getRedactionsFromCurrentFrameset.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.illustrateRollback=this.illustrateRollback.bind(this)
    this.redactRollback=this.redactRollback.bind(this)
    this.createSubsequence=this.createSubsequence.bind(this)
    this.addSubsequenceToMainSequence=this.addSubsequenceToMainSequence.bind(this)
  }

  buildWorkflowBottomNav() {
    return (
      <div className='col-4'>
        <div className='d-inline'>
          current step:
        </div>
        <div className='d-inline font-weight-bold ml-2'>
        WF BOTTOM NAV
        </div>
      </div>
    )
  }

  componentDidMount() {
    this.props.addWorkflowCallbacks({
        'templatesExist': this.templatesExist,
        'sequenceImagesExist': this.sequenceImagesExist,
        'redactedSequenceImagesExist': this.redactedSequenceImagesExist,
        'illustratedSequenceImagesExist': this.illustratedSequenceImagesExist,
        'animatedSequenceImagesExist': this.animatedSequenceImagesExist,
        'activateSequenceMovie': this.activateSequenceMovie,
        'movieHasBeenLoaded': this.movieHasBeenLoaded,
        'sequenceFramesHaveBeenGrabbed': this.sequenceFramesHaveBeenGrabbed,
        'activateSourceMovie': this.activateSourceMovie,
        'startCaptureImages': this.startCaptureImages,
        'startLoadMovie': this.startLoadMovie,
        'startRedact': this.startRedact,
        'startBuildTemplates': this.startBuildTemplates,
        'startScanTemplates': this.startScanTemplates,
        'startIllustrate': this.startIllustrate,
        'startAnimate': this.startAnimate,
        'startPrecisionLearning': this.startPrecisionLearning,
        'illustrateRollback': this.illustrateRollback,
        'redactRollback': this.redactRollback,
    }) 
    this.scrubberOnChange()
    this.props.getPipelines()
    document.getElementById('compose_link').classList.add('active')
    document.getElementById('compose_link').classList.add('border-bottom')
    document.getElementById('compose_link').classList.add('pb-0')
    var app_this=this
    this.addCallback({
      'add_1_box': this.do_add_1_box,
      'add_2_box': this.do_add_2_box,
      'add_1_ocr': this.do_add_1_ocr,
      'add_2_ocr': this.do_add_2_ocr,
      'illustrate_box_1': this.do_illustrate_box_1,
      'illustrate_box_shaded_1': this.do_illustrate_box_shaded_1,
      'illustrate_box_2': this.do_illustrate_box_2,
      'illustrate_box_shaded_2': this.do_illustrate_box_shaded_2,
      'illustrate_oval_1': this.do_illustrate_oval_1,
      'illustrate_oval_shaded_1': this.do_illustrate_oval_shaded_1,
      'illustrate_oval_2': this.do_illustrate_oval_2,
      'illustrate_oval_shaded_2': this.do_illustrate_oval_shaded_2,
      'illustrate_oval_3': this.do_illustrate_oval_3,
      'illustrate_oval_shaded_3': this.do_illustrate_oval_shaded_3,
      'add_template_anchor_1': this.do_add_template_anchor_1,
      'add_template_mask_zone_1': this.do_add_template_mask_zone_1,
    })
    if (
      this.props.workflows &&
      !Object.keys(this.props.workflows).includes('precision_learning')
    ) {
      let deepCopyWorkflows = JSON.parse(JSON.stringify(this.props.workflows))
      deepCopyWorkflows['precision_learning'] = Workflows.precision_learning_workflow
      this.props.setGlobalStateVar('workflows', deepCopyWorkflows)
    }
    setTimeout(function() {app_this.props.setActiveWorkflow('precision_learning')}, 500)
  }

  addSubsequenceToMainSequence() {
    if (Object.keys(this.props.subsequences).length === 0) {
      return 
    }
    const subsequence_id = Object.keys(this.props.subsequences)[0]
    const subsequence = this.props.subsequences[subsequence_id]
    if (!Object.keys(subsequence).includes('rendered_image')) {
      return 
    }

    this.props.addImageToMovie({
      url: subsequence['rendered_image'],
      movie_url: 'sequence',
      update_frameset_hash: false,
    })

    this.createSubsequence()
  }

  createSubsequence() {
    let deepCopySubsequences = {}
    const subsequence_id = (
      'subsequence_' + 
      Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    )
    const new_subsequence = {
      id: subsequence_id,
      images: [],
      framesets: {},
      delay: 1000,
    }
    deepCopySubsequences[subsequence_id] = new_subsequence
    this.props.setGlobalStateVar('subsequences', deepCopySubsequences)
  }

  illustrateRollback() {
    this.props.clearCurrentIllustrations()
  }

  redactRollback() {
    this.props.clearCurrentRedactions()
  }

  addRedactionToFrameset(areas_to_redact) {                               
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.props.getCurrentFramesets()))
    deepCopyFramesets[this.props.active_frameset_hash]['areas_to_redact'] = areas_to_redact
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let cur_movie = deepCopyMovies[this.props.movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[this.props.movie_url] = cur_movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
  }

  getRedactionsFromCurrentFrameset() {
    const framesets = this.props.getCurrentFramesets()
    if (!framesets || !this.props.getImageUrl()) {
        return []
    }
    let frameset = framesets[this.props.active_frameset_hash]
    if (frameset) {
      if (Object.keys(frameset).indexOf('areas_to_redact') > -1) {
          return frameset['areas_to_redact']
      } else {
          return []
      }
    } else {
      return []
    }
  }

  do_add_1_box(cur_click) {
    this.setMode('add_2_box')
  }

  do_illustrate_box_1(cur_click) {
    this.setMode('illustrate_box_2')
  }

  do_illustrate_box_shaded_1(cur_click) {
    this.setMode('illustrate_box_shaded_2')
  }

  do_illustrate_box_2(cur_click) {
    this.setMode('')
    this.submitComposeJob(
      'illustrate_box',
      {
        second_click: cur_click,
        shaded: false,
      },
    )
  }

  do_illustrate_box_shaded_2(cur_click) {
    this.setMode('')
    this.submitComposeJob(
      'illustrate_box',
      {
        second_click: cur_click,
        shaded: true,
      },
    )
  }

  do_illustrate_oval_1(cur_click) {
    const message = getMessage('illustrate_oval_2')
    this.setMessage(message)
    this.setState({
      'mode': 'illustrate_oval_2',
      'oval_center': cur_click,
    })
  }

  do_illustrate_oval_shaded_1(cur_click) {
    const message = getMessage('illustrate_oval_shaded_2')
    this.setMessage(message)
    this.setState({
      'mode': 'illustrate_oval_shaded_2',
      'oval_center': cur_click,
    })
  }

  do_illustrate_oval_2(cur_click) {
    this.setMode('illustrate_oval_3')
  }

  do_illustrate_oval_shaded_2(cur_click) {
    this.setMode('illustrate_oval_shaded_3')
  }

  do_illustrate_oval_3(cur_click) {
    this.setMode('')
    this.submitComposeJob(
      'illustrate_oval',
      {
        second_click: cur_click,
        shaded: false,
      },
    )
  }

  do_illustrate_oval_shaded_3(cur_click) {
    this.setMode('')
    this.submitComposeJob(
      'illustrate_oval',
      {
        second_click: cur_click,
        shaded: true,
      },
    )
  }

  do_add_2_box(cur_click) {
    let deepCopyAreasToRedact = this.getRedactionsFromCurrentFrameset()
    const new_a2r = {
      start: [this.state.last_click[0], this.state.last_click[1]],
      end: cur_click,
      text: 'you got it hombre',
      source: 'manual',
      id: Math.floor(Math.random() * 1950960),
    }
    deepCopyAreasToRedact.push(new_a2r)
    this.setMessage('region was successfully added, select another region to add')
    this.addRedactionToFrameset(deepCopyAreasToRedact)
    this.redactImage([new_a2r])
    this.setState({mode: 'add_1_box'})
  }

  componentWillUnmount() {
    document.getElementById('compose_link').classList.remove('active')
    document.getElementById('compose_link').classList.add('border-0')
    document.getElementById('compose_link').classList.remove('pb-0')
  }

  do_add_1_ocr(cur_click) {
    this.setMode('add_2_ocr')
  }

  do_add_2_ocr(cur_click) {
    const ocr_rule = this.buildSingleUseOcrRule(this.state.last_click, cur_click)
    const movies = this.props.buildMoviesForSingleFrame()
    const pipeline_job_props = {
      cancel_after_loading: true,
    }
    this.props.runOcrRedactPipelineJob(ocr_rule, movies, pipeline_job_props)
    this.setState({mode: ''})
  }

  addCallback(the_dict) {                          
    let deepCopyCallbacks = this.state.callbacks
    for (let i=0; i < Object.keys(the_dict).length; i++) {
      const the_key = Object.keys(the_dict)[i]
      const the_func = the_dict[the_key]
      deepCopyCallbacks[the_key] = the_func
    }
    this.setState({
      'callbacks': deepCopyCallbacks, 
    })
  } 

  handleImageClick = (e) => {
    if (!this.props.getImageUrl()) {
      return
    }
    let x = e.nativeEvent.offsetX
    let y = e.nativeEvent.offsetY
    const x_scaled = parseInt(x / this.props.image_scale)
    const y_scaled = parseInt(y / this.props.image_scale)
    if (x_scaled > this.props.image_width || y_scaled > this.props.image_height) {
      return
    }
    if (Object.keys(this.state.callbacks).includes(this.state.mode)) {
      this.state.callbacks[this.state.mode]([x_scaled, y_scaled])
    } 
    this.setState({
      last_click: [x_scaled, y_scaled],
    })
  }

  redactImage(areas_to_redact=null)  {
    if (!areas_to_redact) {
      areas_to_redact = this.getRedactionsFromCurrentFrameset()
    }
    if (areas_to_redact.length > 0) {
      this.submitComposeJob(
        'redact',
        {areas_to_redact: areas_to_redact}
      )
    } else {
      this.setMessage('Nothing to redact has been specified')
    }
  }

  setMessage(the_message)  {
    this.props.setGlobalStateVar('message', the_message)
  }

  setMode(the_mode) {
    const message = getMessage(the_mode)
    this.setMessage(message)
    this.setState({mode: the_mode})
  }

  sequenceFramesHaveBeenGrabbed() {
    if (
      this.props.movies
      && Object.keys(this.props.movies).includes('sequence')
      && Object.keys(this.props.movies['sequence']).includes('framesets')
      && Object.keys(this.props.movies['sequence']['framesets']).length > 0 
    ) {
      return true
    }
    return false
  }

  movieHasBeenLoaded() {
    if (
      this.props.movies
      && this.props.movie_url 
      && Object.keys(this.props.movies).includes(this.props.movie_url)
      && Object.keys(this.props.movies[this.props.movie_url]).includes('framesets')
      && Object.keys(this.props.movies[this.props.movie_url]['framesets']).length > 0 
    ) {
      return true
    }
    return 'cannot proceed, a movie needs to have been loaded'
  }

  activateSequenceMovie() {
    this.setMovie('sequence')
  }

  startLoadMovie() {
    this.setMessage('')
    this.activateSourceMovie()
    this.setState({
      displayFetchRecordingId: true,
      displayCaptureButton: false,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: false,
      displayImageControls: false,
      displayIllustrateControls: false,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    })
  }

  startCaptureImages() {
    this.setMessage('')
    this.activateSourceMovie()
    this.setState({
      displayFetchRecordingId: false,
      displayCaptureButton: true,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: false,
      displayImageControls: false,
      displayIllustrateControls: false,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    })
  }

  startRedact() {
    this.setMessage('')
    this.setMovie('sequence')
    this.setState({
      displayFetchRecordingId: false,
      displayCaptureButton: false,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: false,
      displayImageControls: true,
      displayIllustrateControls: false,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    })
  }

  startBuildTemplates() {
    this.setMessage('')
    this.setMovie('sequence')
    this.setState({
      displayFetchRecordingId: false,
      displayCaptureButton: false,
      displayBuildTemplateControls: true,
      displayRunTemplateControls: false,
      displayImageControls: false,
      displayIllustrateControls: false,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    })
  }

  startScanTemplates() {
    this.setMessage('')
    this.setMovie('sequence')
    this.setState({
      displayFetchRecordingId: false,
      displayCaptureButton: false,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: true,
      displayImageControls: false,
      displayIllustrateControls: false,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    })
  }

  startIllustrate() {
    this.setMessage('')
    this.setMovie('sequence')
    this.setState({
      displayFetchRecordingId: false,
      displayCaptureButton: false,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: false,
      displayImageControls: false,
      displayIllustrateControls: true,
      displayAnimateControls: false,
      displayPrecisionLearning: false,
    })
  }

  startAnimate() {
    this.setMessage('')
    this.setMovie('sequence')
    this.setState({
      displayFetchRecordingId: false,
      displayCaptureButton: false,
      displayBuildTemplateControls: false,
      displayRunTemplateControls: false,
      displayImageControls: false,
      displayIllustrateControls: false,
      displayAnimateControls: true,
      displayPrecisionLearning: false,
    })
  }

  startPrecisionLearning() {
    const precondition_test_results = this.sequenceImagesExist()
    if (precondition_test_results !== true) {
      return precondition_test_results
    }
    let resp = window.confirm("Are you sure you're ready to go to the Precision Learning website?")
    if (resp) {
      this.props.gotoWhenDoneTarget()
    } else {
      return 'user declined to proceed to Precision Learning'
    }
  }

  activateSourceMovie() {
    for (let i=0; i < Object.keys(this.props.movies).length; i++) {
      const movie_url = Object.keys(this.props.movies)[i]
      if (movie_url !== 'sequence') {
        this.setMovie(movie_url)
        break
      }
    }
  }

  sequenceImagesExist() { // return true for ok, error string for problem
    if (Object.keys(this.props.movies).includes('sequence')) {
      const seq_movie = this.props.movies['sequence']
      if (seq_movie.frames.length > 0) {
        return true
      }
    }
    return 'cannot proceed, at least one image needs to have been captured'
  }

  templatesExist() { // return true for ok, error string for problem
    if (Object.keys(this.props.tier_1_scanners['template']).length > 0) {
      return true
    }
    return 'no templates found'
  }

  redactedSequenceImagesExist() { // return true for ok, error string for problem
    if (Object.keys(this.props.movies).includes('sequence')) {
      const seq_movie = this.props.movies['sequence']
      for (let i=0; i < Object.keys(seq_movie['framesets']).length; i++) {
        const frameset_hash = Object.keys(seq_movie['framesets'])[i]
        const frameset = seq_movie['framesets'][frameset_hash]
        if (Object.keys(frameset).includes('redacted_image')) {
          return true
        }
      }
    }
    return 'no frames have been redacted'
  }

  illustratedSequenceImagesExist() { // return true for ok, error string for problem
    if (Object.keys(this.props.movies).includes('sequence')) {
      const seq_movie = this.props.movies['sequence']
      for (let i=0; i < Object.keys(seq_movie['framesets']).length; i++) {
        const frameset_hash = Object.keys(seq_movie['framesets'])[i]
        const frameset = seq_movie['framesets'][frameset_hash]
        if (Object.keys(frameset).includes('illustrated_image')) {
          return true
        }
      }
    }
    return 'no frames have been illustrated'
  }

  animatedSequenceImagesExist() { // return true for ok, error string for problem
    if (Object.keys(this.props.movies).includes('sequence')) {
      const seq_movie = this.props.movies['sequence']
      for (let i=0; i < seq_movie.frames.length; i++) {
        const image_name = seq_movie.frames[i]
        if (image_name.endsWith('.gif')) {
          return true
        }
      }
    }
    return 'no frames have been animated'
  }

  generateSubsequence(subsequence_id) {
    this.submitComposeJob('render_subsequence', subsequence_id)
  }

  buildRenderSubsequenceJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    const subsequence_id = extra_data
    const subsq_name = this.props.subsequences[subsequence_id]['name']
    job_data['app'] = 'parse'
    job_data['operation'] = 'render_subsequence'
    job_data['description'] = 'render subsequence from ComposePanel: subsequence ' + subsq_name
    job_data['request_data'] = {
      subsequence: this.props.subsequences[subsequence_id]
    }
    return job_data
  }

  buildRedactJobData(extra_data) {
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
    job_data['request_data']['redact_rule'] = this.props.redact_rule

    if (Object.keys(extra_data).includes('areas_to_redact')) {
      job_data['request_data']['areas_to_redact'] = extra_data['areas_to_redact']
    } else {
      let frameset = this.props.movies[this.props.movie_url]['framesets'][frameset_hash]
      let pass_arr = []
      for (let i=0; i < frameset['areas_to_redact'].length; i++) {
        let a2r = frameset['areas_to_redact'][i]
        pass_arr.push(a2r)
      }
      job_data['request_data']['areas_to_redact'] = pass_arr
    }
    return job_data
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
      shade_outside: extra_data['shaded'],
      start: this.state.last_click,
      end: extra_data['second_click'],
      color: this.props.illustrateParameters['color'],
      line_width: parseInt(this.props.illustrateParameters['lineWidth']),
      background_darken_ratio: parseFloat(this.props.illustrateParameters['backgroundDarkenPercent']),
    }
    job_data['request_data']['illustration_data'] = illustration_data
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
      shade_outside: extra_data['shaded'],
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

  submitComposeJob(job_string, extra_data = '') {
    if (job_string === 'render_subsequence') {
      const job_data = this.buildRenderSubsequenceJobData(extra_data)
      this.props.submitJob({
        job_data:job_data,
        after_submit: () => {this.setMessage('render subsequence job was submitted')},
        delete_job_after_loading: true,
        after_loaded: () => {this.setMessage('render subsequence completed')}, when_failed: () => {this.setMessage('render subsequence failed')},
      })
    } else if (job_string === 'redact') {
      const job_data = this.buildRedactJobData(extra_data)
      this.props.submitJob({
        job_data:job_data,
        after_submit: () => {this.setMessage('redact job was submitted')},
        delete_job_after_loading: true,
        after_loaded: () => {this.setMessage('redact completed')},
        when_failed: () => {this.setMessage('redact failed')},
      })
    } else if (job_string === 'illustrate_box') {
      const job_data = this.buildIllustrateBoxJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data,
        after_submit: () => {this.setMessage('illustrate job was submitted')},
        delete_job_after_loading: true,
        after_loaded: () => {this.setMessage('illustration completed')},
        when_failed: () => {this.setMessage('illustration failed')},
      })
    } else if (job_string === 'illustrate_oval') {
      const job_data = this.buildIllustrateOvalJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data,
        after_submit: () => {this.setMessage('illustrate job was submitted')},
        delete_job_after_loading: true,
        after_loaded: () => {this.setMessage('illustration completed')},
        when_failed: () => {this.setMessage('illustration failed')},
      })
    }
  }

  setDraggedItem(the_type, the_id) {
    this.setState({
      dragged_type: the_type,
      dragged_id: the_id,
    })
  }

  moveSequenceFrameUp(frameset_hash) {
    if (this.props.movie_url !== 'sequence') {
      return 
    }
    if (!Object.keys(this.props.movies).includes('sequence')) {
      return 
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let sequence = deepCopyMovies['sequence']
    const hashes_in_order = this.props.getFramesetHashesInOrder(sequence)
    if (!hashes_in_order.includes(frameset_hash)) {
      return
    }
    let cur_index = hashes_in_order.indexOf(frameset_hash)
    if (cur_index === 0) {
      return
    }
    let above_index = cur_index - 1
    let cur_img = JSON.parse(JSON.stringify(sequence['frames'][cur_index]))
    let above_img = JSON.parse(JSON.stringify(sequence['frames'][above_index]))
    sequence['frames'][cur_index] = above_img
    sequence['frames'][above_index] = cur_img
    const new_hashes_in_order = this.props.getFramesetHashesInOrder(sequence)
    sequence['frameset_hashes_in_order'] = new_hashes_in_order
    deepCopyMovies['sequence'] = sequence
    this.props.setGlobalStateVar(
      'movies', 
      deepCopyMovies,
      (()=>{
        this.setScrubberValue(cur_index)
        this.scrubberOnChange()
      })
    )
  }

  moveSequenceFrameDown(frameset_hash) {
    if (this.props.movie_url !== 'sequence') {
      return 
    }
    if (!Object.keys(this.props.movies).includes('sequence')) {
      return 
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let sequence = deepCopyMovies['sequence']
    const hashes_in_order = this.props.getFramesetHashesInOrder(sequence)
    if (!hashes_in_order.includes(frameset_hash)) {
      return
    }
    let cur_index = hashes_in_order.indexOf(frameset_hash)
    if (cur_index >= sequence.frames.length - 1) {
      return
    }
    let below_index = cur_index + 1
    let cur_img = JSON.parse(JSON.stringify(sequence['frames'][cur_index]))
    let below_img = JSON.parse(JSON.stringify(sequence['frames'][below_index]))
    sequence['frames'][cur_index] = below_img
    sequence['frames'][below_index] = cur_img
    const new_hashes_in_order = this.props.getFramesetHashesInOrder(sequence)
    sequence['frameset_hashes_in_order'] = new_hashes_in_order
    deepCopyMovies['sequence'] = sequence
    this.props.setGlobalStateVar(
      'movies', 
      deepCopyMovies,
      (()=>{
        this.setScrubberValue(cur_index)
        this.scrubberOnChange()
      })
    )
  }

  handleDroppedOntoSubsequence(subsequence_id) {
    if (this.state.dragged_type !== 'sequence') {
      return 
    }
    let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
    deepCopySubsequences[subsequence_id]['images'].push(this.state.dragged_id)

    const sequence = this.props.movies['sequence']
    if (this.state.dragged_id.endsWith('.gif')) {
      this.setMessage('ERROR - cannot use an animated image as the source of a new one')
      return 
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(
      this.state.dragged_id, 
      sequence['framesets']
    )
    const frameset = sequence['framesets'][frameset_hash] 
    deepCopySubsequences[subsequence_id]['framesets'][frameset_hash] = frameset

    this.props.setGlobalStateVar('subsequences', deepCopySubsequences)
    this.removeSequenceFrame(frameset_hash)
  }

  handleDroppedOntoSequence() {
    if (this.state.dragged_type === 'subsequence') {
      let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
      let deepCopySequence = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
      const subsequence = this.props.subsequences[this.state.dragged_id]
      if (deepCopySequence['frames'].includes(subsequence['rendered_image'])) {
        return
      }
      const new_hash = Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
      const frameset = {
        images: [subsequence['rendered_image']]
      }
      deepCopySequence['frames'].push(subsequence['rendered_image'])
      deepCopySequence['framesets'][new_hash] = frameset
      deepCopyMovies['sequence'] = deepCopySequence
      this.props.setGlobalStateVar('movies', deepCopyMovies)
      if (this.props.movie_url === 'sequence') {
        this.setScrubberMax(deepCopySequence['frames'].length-1) 
      }
      this.scrubberOnChange()
      this.createSubsequence()
    }
  }

  setScrubberMax(the_number) {
    document.getElementById('compose_scrubber').max = the_number
  }

  setScrubberValue(the_number) {
    document.getElementById('compose_scrubber').value = the_number
  }

  removeSequenceFrame(frameset_hash_to_delete) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
    let build_frames = []
    let build_framesets = {}
    let new_hash = 1
    for (let i=0; i < Object.keys(movie['framesets']).length; i++) {
      const frameset_hash = Object.keys(movie['framesets'])[i]
      const old_frameset = movie['framesets'][frameset_hash]
      const frame_url = old_frameset['images'][0]
      if (frameset_hash === frameset_hash_to_delete) {
        continue
      }
      build_frames.push(frame_url)
      build_framesets[new_hash.toString()] = old_frameset
      new_hash += 1
    }
    movie['frames'] = build_frames
    movie['framesets'] = build_framesets
    deepCopyMovies['sequence'] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    const num_frames = movie['frames'].length - 1
    this.setScrubberMax(num_frames)
    this.setScrubberValue(0)
    this.scrubberOnChange()
  }

  updateMovieOffsetMessage(offset_in_seconds) {
    if (!this.props.movie_url) {
      return
    }
    const mins_offset = Math.floor(parseInt(offset_in_seconds) / 60)
    const secs_offset = parseInt(offset_in_seconds) % 60
    const secs_string = secs_offset.toString()
    const build_string = mins_offset.toString() + ':' + secs_string.padStart(2, '0')
    this.setState({
      movie_offset_string: build_string,
    })
  }

  scrubberOnChange(the_frameset_hash='', framesets='', frame_url='') {
    const value = document.getElementById('compose_scrubber').value
    if (
      typeof the_frameset_hash === 'object'  // manually moving the scrubber yields an event 
      || (!the_frameset_hash && !framesets && !frame_url) // calling this method with empty parms
    ) {
      const frames = this.props.getCurrentFrames()
      framesets = this.props.getCurrentFramesets()
      frame_url = frames[value]
      the_frameset_hash = this.props.getFramesetHashForImageUrl(frame_url)
    }
    this.props.setFramesetHash(
      the_frameset_hash, 
      framesets, 
      (()=>{this.setImageSize(frame_url)}) 
    )

    this.updateMovieOffsetMessage(value)
    // clear out global message with scrubber movement
    this.props.setGlobalStateVar('message', '')
  }

  setImageSize(the_image) {
    var app_this = this
    if (the_image) {
      let img = new Image()
      img.src = the_image
      img.onload = function() {
        app_this.props.setGlobalStateVar(
          {
            image_width: this.width,
            image_height: this.height,
          },
          app_this.setImageScale()
        )
      }
    }
  }

  setImageScale() {
    if (!document.getElementById('compose_image')) {
      return
    }
    const scale = (document.getElementById('compose_image').width /
        document.getElementById('compose_image').naturalWidth)
    this.props.setGlobalStateVar('image_scale', scale)
  }

  getMaxRange() {
    if (!this.props.movies || !this.props.movie_url || 
        (!Object.keys(this.props.movies).includes(this.props.movie_url))) {
      return 1
    }
    const movie = this.props.movies[this.props.movie_url]
    const max_len = movie['frames'].length - 1
    return max_len
  }

  captureFrame() {
    if (!Object.keys(this.props.movies).includes('sequence')) {
      this.props.establishNewEmptyMovie(
        'sequence', 
        false,
        ((new_movie)=>{this.props.addImageToMovie(
          {
            url: this.props.getImageUrl(),
            movie_url: 'sequence',
            update_frameset_hash: false,
            movie: new_movie,
          }
        )})
      )
    } else {
      this.props.addImageToMovie({
        url: this.props.getImageUrl(),
        movie_url: 'sequence',
        update_frameset_hash: false,
      })
    }
  }

  buildCaptureButton() {
    if (!this.state.displayCaptureButton) {
      return ''
    }
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.captureFrame()}
      >
        Capture
      </button>
    )
  }

  buildWhenDoneLink() {
    if (!this.state.displayPrecisionLearning) {
      return ''
    }
    if (this.props.whenDoneTarget) {
      return (
        <button
            className='btn btn-link'
            onClick={() => this.props.gotoWhenDoneTarget()}
        >
          Go to Precision Learning
        </button>
      )
    }
  }

  setMovie(movie_url) {
    if (movie_url === this.props.movie_url) {
      return
    }
    this.props.setGlobalStateVar('movie_url', movie_url)
    const movie = this.props.movies[movie_url]
    const frameset_hashes = Object.keys(movie.framesets)
    if (frameset_hashes.length) {
      this.props.setFramesetHash(
        frameset_hashes[0], 
        movie.framesets, 
        (()=>{this.setImageSize(movie.frames[0])}) 
      )
    }
    if (Object.keys(movie).includes('frames')) {
      this.setScrubberMax(movie.frames.length)
    } 
    this.setScrubberValue(0)
  }

  buildMovieNameDisplay() {
    if (!this.props.movie_url) {
      return ''
    }
    let movie_view_message = ''
    if (this.props.movie_url === 'sequence') {
      movie_view_message = 'viewing the images going to precision learning'
    } else {
      const movie_name = this.props.movie_url.split('/').slice(-1)[0]
      movie_view_message = 'viewing movie ' + movie_name
    }
    return (
      <div className='d-inline ml-4'>
        {movie_view_message}
      </div>
    )
  }

  buildComposeMessageDiv() {
    // a hack because I can't get min-height working for the message field
    if (!this.props.message) {
      return (
        <div className='text-white'>
          .
        </div>
      )
    }
    return (
      <div>
        {this.props.message}
      </div>
    )
  }

  gotoScrubberOffset(the_offset) {
    this.setScrubberValue(the_offset)
    this.scrubberOnChange()
  }

  buildFetchAndSplit() {
    if (!this.state.displayFetchRecordingId) {
      return ''
    }
    return (
      <div>
        <div className='d-inline ml-4'>
          fetch recording id
        </div>
        <div className='d-inline ml-2'>
          <input
            id='recording_id'
            size='40'
          />
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary'
              onClick={()=>
                this.props.dispatchFetchSplitAndHash(document.getElementById('recording_id').value, true)
              }
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  buildComposeImage() {
    const compose_display_image = this.props.getImageUrl()
    const the_style = {
      'height': '500px',
      'width': '1000px',
      'paddingTop': '200px',
    }
    if (compose_display_image) {
      return (
        <img
            id='compose_image'
            className='p-0 m-0 mw-100 mh-100'
            src={compose_display_image}
            alt={compose_display_image}
        />
      )
    } else if (
        this.props.attached_job['id'] && 
        this.props.attached_job['status'] === 'running'
    ) {
      return (
        <div
            className='h1 text-center'
            style={the_style}
        >
          <div className='spinner-border' role='status' />
        </div>
      )
    } else if (
        this.props.attached_job['id'] && 
        this.props.attached_job['status'] === 'success'
    ) {
      return (
        <div
            className='h1 text-center'
            style={the_style}
        >
          Movie split completed, loading...
        </div>
      )
    } else if (
        this.props.attached_job['id'] && 
        this.props.attached_job['status'] === 'failed'
    ) {
      return (
        <div
            className='h1 text-center'
            style={the_style}
        >
          Movie split failed
        </div>
      )
    } else {
      return (
        <div
            className='h1 text-center'
            style={the_style}
        >
          No movie loaded yet
        </div>
      )
    }
  }

  buildBreadcrumbsTitleArea() {
    if (!this.props.breadcrumbs_title && !this.props.breadcrumbs_subtitle) {
      return ''
    }
    return (
      <div className='col'>
        <div className='row h2 ml-5'>
          {this.props.breadcrumbs_title}
        </div>
        <div className='row h4 ml-5'>
          {this.props.breadcrumbs_subtitle}
        </div>
      </div>
    )
  }

  buildTemplateControls() {
    if (!this.state.displayBuildTemplateControls) {
      return ''
    }
    return (
      <SimpleTemplateBuilderControls
        last_click={this.state.last_click}
        getImageUrl={this.props.getImageUrl}
        movie_url={this.props.movie_url}
        setMode={this.setMode}
        setMessage={this.setMessage}
        addCallback={this.addCallback}
        tier_1_scanners={this.props.tier_1_scanners}
        tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
        setGlobalStateVar={this.props.setGlobalStateVar}
        cropImage={this.props.cropImage}
      />
    )
  }

  buildImageInfoControls() {
    if (
      !this.state.displayImageControls
      && !this.state.displayIllustrateControls
    ) {
      return ''
    }
    return (
      <ComposeImageInfoControls
        getImageUrl={this.props.getImageUrl}
        redact_rule={this.props.redact_rule}
        setGlobalStateVar={this.props.setGlobalStateVar}
        getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
        setIllustrateParameters={this.props.setIllustrateParameters}
        illustrateParameters={this.props.illustrateParameters}
        displayImageControls={this.state.displayImageControls}
        displayIllustrateControls={this.state.displayIllustrateControls}
      />
    )
  }

  buildPositionLabel() {
    if (!this.props.movie_url) {
      return ''
    }
    const position_string = 'Position: ' + this.state.movie_offset_string
    return (
      <div>
        {position_string}
      </div>
    )
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

  getCurrentTemplateAnchors() {
    const template_id = this.props.tier_1_scanner_current_ids['template']
    const template = this.props.tier_1_scanners['template'][template_id]
    if (template) {
      return template['anchors']
    }
    return []
  }

  getCurrentTemplateMaskZones() {
    const template_id = this.props.tier_1_scanner_current_ids['template']
    const template = this.props.tier_1_scanners['template'][template_id]
    if (template) {
      return template['mask_zones']
    }
    return []
  }

  render() {
    const capture_button = this.buildCaptureButton()
    const fetch_and_split_input = this.buildFetchAndSplit()
    const image_info_controls = this.buildImageInfoControls()
    const when_done_link = this.buildWhenDoneLink()
    const max_range = this.getMaxRange()
    const view_dropdown = this.buildMovieNameDisplay()
    const compose_message = this.buildComposeMessageDiv()
    const compose_image = this.buildComposeImage()
    const breadcrumbs_area = this.buildBreadcrumbsTitleArea()
    const template_controls = this.buildTemplateControls()
    const position_label = this.buildPositionLabel()
    const workflow_bottom_nav = this.props.buildWorkflowBottomNav()

    return (
      <div id='compose_panel_container'>
        <div className='row ml-4'>
          <div className='col-7'>

            <div className='row' >
              {breadcrumbs_area}
            </div>

            <div className='row m-2' >
                {when_done_link}
            </div>

            <div className='row bg-light'>
              <div className='col'>
                <div className='row'>
                  {compose_image}
                  <CanvasComposeOverlay
                    getImageUrl={this.props.getImageUrl}
                    image_width={this.props.image_width}
                    image_height={this.props.image_height}
                    image_scale={this.props.image_scale}
                    last_click={this.state.last_click}
                    oval_center= {this.state.oval_center}
                    mode={this.state.mode}
                    clickCallback= {this.handleImageClick}
                    getRedactionsFromCurrentFrameset={this.getRedactionsFromCurrentFrameset}
                    getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
                    getCurrentTemplateMaskZones={this.getCurrentTemplateMaskZones}
                    currentImageIsTemplateAnchorImage={this.currentImageIsTemplateAnchorImage}
                  />
                </div>

              </div>
            </div>

            <div className='row bg-light border rounded'>
              <div className='col'>

                <div className='row ml-2 mt-2'>
                  <div className='col-11'>
                    {compose_message}
                  </div>
                  <div className='col-1'>
                    <JobBug
                      jobs={this.props.jobs}
                      attached_job={this.props.attached_job}
                    />
                  </div>
                </div>

                <div className='row mt-2'>
                  <input
                    id='compose_scrubber'
                    type='range'
                    max={max_range}
                    defaultValue='0'
                    onChange={this.scrubberOnChange}
                  />
                </div>

                <div className='row border-bottom m-1 pb-1'>
                  <div className='d-inline '>
                    {position_label}
                  </div>
                  <div className='d-inline ml-2'>
                    {view_dropdown}
                  </div>
                </div>

                <div className='row border-bottom m-1 pb-1'>
                  {workflow_bottom_nav}
                </div>

                <div className='row m-2'>
                  {capture_button}
                  {fetch_and_split_input}
                </div>

                <div className='row m-2'>
                  <div className='col'>
                    <ComposeImageControls
                      getImageUrl={this.props.getImageUrl}
                      setMessage={this.setMessage}
                      setMode={this.setMode}
                      templates={this.props.templates}
                      clearCurrentFramesetChanges={this.props.clearCurrentFramesetChanges}
                      displayImageControls={this.state.displayImageControls}
                      displayRunTemplateControls={this.state.displayRunTemplateControls}
                      displayIllustrateControls={this.state.displayIllustrateControls}
                      runTemplateRedactPipelineJob={this.props.runTemplateRedactPipelineJob}
                      clearCurrentIllustrations={this.props.clearCurrentIllustrations}
                    />
                  </div>
                </div>

                <div className='row m-2'>
                  {image_info_controls}
                </div>

                <div className='row m-2'>
                  {template_controls}
                </div>

                <div className='row m-2'>
                  <SubsequencePanel
                    compose_image={this.state.compose_image}
                    subsequences={this.props.subsequences}
                    setGlobalStateVar={this.props.setGlobalStateVar}
                    setDraggedItem={this.setDraggedItem}
                    handleDroppedOntoSubsequence={this.handleDroppedOntoSubsequence}
                    handleDroppedOntoSequence={this.handleDroppedOntoSequence}
                    generateSubsequence={this.generateSubsequence}
                    movies={this.props.movies}
                    movie_url={this.props.movie_url}
                    displayAnimateControls={this.state.displayAnimateControls}
                    createSubsequence={this.createSubsequence}
                    addSubsequenceToMainSequence={this.addSubsequenceToMainSequence}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='col-5'>
            <div className='row mt-3 ml-1 mr-1'>
              <SequencePanel
                removeSequenceFrame={this.removeSequenceFrame}
                compose_image={this.state.compose_image}
                subsequences={this.props.subsequences}
                setDraggedItem={this.setDraggedItem}
                handleDroppedOntoSubsequence={this.handleDroppedOntoSubsequence}
                handleDroppedOntoSequence={this.handleDroppedOntoSequence}
                moveSequenceFrameUp={this.moveSequenceFrameUp}
                moveSequenceFrameDown={this.moveSequenceFrameDown}
                movies={this.props.movies}
                movie_url={this.props.movie_url}
                getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
                getCurrentFramesets={this.props.getCurrentFramesets}
                getImageFromFrameset={this.props.getImageFromFrameset}
                active_frameset_hash={this.props.active_frameset_hash}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}


class SequencePanel extends React.Component {

  render() {
    if (!Object.keys(this.props.movies).includes('sequence')) {
      return ''
    }
    const sequence_movie = this.props.movies['sequence']
    const framesets = sequence_movie['framesets']
    const frameset_hashes = this.props.getFramesetHashesInOrder(sequence_movie)
    return (
      <div className='col mt-2'>
        <div className='row h3'>
          Captured Frames
        </div>
        <div className='row'>
          <div id='sequence_card_wrapper'>
            {frameset_hashes.map((frameset_hash, index) => {
              const frame_url = this.props.getImageFromFrameset(frameset_hash, framesets)
              return (
              <SequenceCard
                frame_url={frame_url}
                image_offset={index}
                frameset_hash={frameset_hash}
                key={index}
                sequence_movie={sequence_movie}
                removeSequenceFrame={this.props.removeSequenceFrame}
                compose_image={this.props.compose_image}
                setDraggedItem={this.props.setDraggedItem}
                handleDroppedOntoSequence={this.props.handleDroppedOntoSequence}
                moveSequenceFrameUp={this.props.moveSequenceFrameUp}
                moveSequenceFrameDown={this.props.moveSequenceFrameDown}
                movies={this.props.movies}
                movie_url={this.props.movie_url}
                active_frameset_hash={this.props.active_frameset_hash}
              />
              )
            })}
          </div>
        </div>
      </div>
    )
  }
}

class SubsequencePanel extends React.Component {
  componentDidMount() {
    this.props.createSubsequence()
  }

  buildIntervalField(subsequence) {
    return (
      <div>
        <div className='d-inline'>
          interval (ms):
        </div>
        <div className='d-inline ml-2'>
          <select
              name='subsequence_interval'
              value={subsequence['interval']}
              onChange={(event) => this.setSubsequenceValue(
                  subsequence['id'], 
                  'interval', 
                  event.target.value
              )}
          >
            <option value='100'>100</option>
            <option value='200'>200</option>
            <option value='300'>300</option>
            <option value='500'>500</option>
            <option value='700'>700</option>
            <option value='1000'>1000</option>
            <option value='2000'>2000</option>
            <option value='3000'>3000</option>
            <option value='4000'>4000</option>
          </select>
        </div>
      </div>
    )
  }

  buildGenerateLink(subsequence) {
    if (Object.keys(subsequence).includes('rendered_image')) {
      return ''
    }
    if (Object.keys(subsequence.framesets).length === 0) {
      return ''
    }
    return (
      <button
        className='border-0 btn btn-primary ml-2'
        onClick={() => this.props.generateSubsequence(subsequence['id'])}
      >
        generate
      </button>
    )
  }

  buildResetLink(subsequence) {
    if (Object.keys(subsequence.framesets).length === 0) {
      return ''
    }
    return (
      <button
        className='border-0 btn btn-primary ml-2'
        onClick={() => this.props.createSubsequence()}
      >
        reset
      </button>
    )
  }

  buildAddToMainSequenceLink(subsequence) {
    if (!Object.keys(subsequence).includes('rendered_image')) {
      return ''
    }
    return (
      <button
        className='border-0 btn btn-primary ml-2'
        onClick={() => this.props.addSubsequenceToMainSequence()}
      >
        add to captured images
      </button>
    )
  }

  buildPreviewWindow(subsequence) {
    if (!Object.keys(subsequence).includes('rendered_image')) {
      return ''
    }
    return (
      <div className='frameCard w-100'>
        <img
          src={subsequence['rendered_image']}
          alt={subsequence['rendered_image']}
        />
      </div>
    )
  }

  setSubsequenceValue(the_id, the_field_name, the_value) {
    let deepCopySubsequences = JSON.parse(JSON.stringify(this.props.subsequences))
    deepCopySubsequences[the_id][the_field_name] = the_value
    this.props.setGlobalStateVar('subsequences', deepCopySubsequences)
  }

  buildImageNameList(subsequence) {
    if (Object.keys(subsequence).includes('rendered_image')) {
      return ''
    }
    if (Object.keys(subsequence.framesets).length === 0) {
      return ''
    }
    return (
      <div className='col'>
        <div className='h4'>
          Frames in this image
        </div>
        <ol>
          {subsequence['images'].map((image_url, index) => {
            const short_name = image_url.split('/').slice(-1)[0]
            return (
              <li key={index}>
                {short_name}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  buildSubsequenceDragDropTarget(subsequence) {
    if (Object.keys(subsequence).includes('rendered_image')) {
      return ''
    }
    return (
      <div
        className='h3 border p-5 m-5'
      >
        Drag and drop captured frames here to add to the animated image
      </div>
    )
  }

  createSubsequencePanel() {
    const subsequence_movie_ids = Object.keys(this.props.subsequences)
    if (!subsequence_movie_ids.length) {
      return ''
    }
    const first_subsequence_key = Object.keys(this.props.subsequences)[0]
    const subsequence = this.props.subsequences[first_subsequence_key]
    const interval_field = this.buildIntervalField(subsequence)
    const generate_link = this.buildGenerateLink(subsequence)
    const reset_link = this.buildResetLink(subsequence)
    const preview_window = this.buildPreviewWindow(subsequence)
    const image_name_list = this.buildImageNameList(subsequence)
    const drag_drop_target = this.buildSubsequenceDragDropTarget(subsequence)
    const add_to_main_link = this.buildAddToMainSequenceLink(subsequence)

    return (
      <div 
        className='col'
        draggable='true'
        onDragStart={
          () => this.props.setDraggedItem('subsequence', subsequence['id'])
        }
        onDragOver={(event) => event.preventDefault()}
        onDrop={
          () => this.props.handleDroppedOntoSubsequence(subsequence['id'])
        }
       >
        <div className='row'>
          <div className='col-6'>
            <div className='row'>
              {interval_field}
            </div>
            <div className='row m-2'>
              {preview_window}
            </div>
            <div className='row m-2'>
              {image_name_list}
            </div>
            <div className='row mt-2 mb-2'>
              {generate_link}
              {reset_link}
              {add_to_main_link}
            </div>
          </div>
          <div className='col-6'>
            {drag_drop_target}
          </div>
        </div>
        <div className='row'>
        </div>

      </div>
    )
  }

  render() {
    if (!this.props.displayAnimateControls) {
      return ''
    }
    if (!Object.keys(this.props.movies).includes('sequence')) {
      return ''
    }
    const subsequence_panel = this.createSubsequencePanel()
    return (
      <div className='col bg-light rounded border'>
        <div className='row border-bottom'>
          <div className='col-6 h3'>
            Animated Images
          </div>
        </div>

        <div className='row ml-2 mr-2'>
          {subsequence_panel}
        </div>
      </div>
    )
  }
}

class SequenceCard extends React.Component {
  getIsCurrentImageIndicator() {
    if (this.props.frameset_hash === this.props.active_frameset_hash) {
      return '*'
    }
    return ''
  }

  buildRemoveLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.removeSequenceFrame(this.props.frameset_hash)}
      >
        remove
      </button>
    )
  }

  buildUpLink() {
    if (this.props.movie_url !== 'sequence') {
      return ''
    }
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.moveSequenceFrameUp(this.props.frameset_hash)}
      >
        up
      </button>
    )
  }

  buildDownLink() {
    if (this.props.movie_url !== 'sequence') {
      return ''
    }
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.moveSequenceFrameDown(this.props.frameset_hash)}
      >
        down
      </button>
    )
  }

  buildFrameName() {
    if (this.props.frame_url) {
      return this.props.frame_url.split('/').slice(-1)[0]
    }
  }

  buildLinks() {
    const remove_link = this.buildRemoveLink()
    const up_link = this.buildUpLink()
    const down_link = this.buildDownLink()
    return (
      <div className='bg-white'>
        <div>
          {remove_link}
          {up_link}
          {down_link}
        </div>
      </div>
    )
  }

  render() {
    const links_div = this.buildLinks()
    const frame_name = this.buildFrameName()
    const is_current_indicator = this.getIsCurrentImageIndicator() 
    let top_div_classname = 'd-inline-block frameCard w-25'
    top_div_classname = 'd-inline-block frameCard w-50'
    if (is_current_indicator) {
      top_div_classname = 'd-inline-block frameCard active_card w-50'
    }
    const display_offset = this.props.image_offset + 1
    return (
      <div
          className={top_div_classname}
          key={this.props.image_offset}
          draggable='true'
          onDragStart={() => this.props.setDraggedItem('sequence', this.props.frame_url)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedOntoSequence()}
      >
        <div
            className='p-2 bg-light m-1'
        >
          <div className='row'>
          <div className='col-9 frameset_hash'>
            {frame_name}
          </div>
          <div className='col-3 h3'>
            {display_offset}
          </div>
          </div>
          <img
              className='zoomable-image'
              src={this.props.frame_url}
              alt={this.props.frame_url}
          />
          {links_div}

        </div>
      </div>
    )
  }
}

export default ComposePanel;
