import React from 'react';
import {
  getMessage, 
  buildFramesetDiscriminatorSelect,
  buildRedactionReplaceWithSelect,
  buildRedactionErodeIterationsSelect,
  buildRedactionBucketClosenessSelect,
  buildRedactionTypeSelect
} from './redact_utils.js'
import MovieImageControls from './MovieImageControls.js'
import FramesetCardList from './Framesets'
import JobBug from './JobBug'
import CanvasMovieOverlay from './CanvasMovieOverlay'
import SimpleTemplateBuilderControls from './SimpleTemplateBuilderControls'

class MoviePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: '',
      last_click: null,
      oval_center: null,
      callbacks: {},
      movie_offset_string: '',
      movie_offset_seconds: 0,
      processing_end_seconds: 0,
      processing_end_minutes: 0,
      show_story_board: false,
      draggedId: null,
      uploadMove: false,
      movie_resolution_new: '',
      frameset_offset_seconds: '0',
      frameset_offset_minutes: '0',
      highlighted_frameset_hash: '',
    }
    this.getNameFor=this.getNameFor.bind(this)
    this.redactFramesetCallback=this.redactFramesetCallback.bind(this)
    this.setDraggedId=this.setDraggedId.bind(this)
    this.handleDroppedFrameset=this.handleDroppedFrameset.bind(this)
    this.handleDroppedMovie=this.handleDroppedMovie.bind(this)
    this.setMessage=this.setMessage.bind(this)
    this.submitMovieJob=this.submitMovieJob.bind(this)
    this.showMovieUploadOptions=this.showMovieUploadOptions.bind(this)
    this.changeMovieResolutionNew=this.changeMovieResolutionNew.bind(this)
    this.changeFramesetOffsetSeconds=this.changeFramesetOffsetSeconds.bind(this)
    this.changeFramesetOffsetMinutes=this.changeFramesetOffsetMinutes.bind(this)
    this.handleImageClick=this.handleImageClick.bind(this)                      
    this.findFramesetAtOffset=this.findFramesetAtOffset.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.addCallback=this.addCallback.bind(this)
    this.do_add_1_box=this.do_add_1_box.bind(this)
    this.do_add_1_box_through_pet=this.do_add_1_box_through_pet.bind(this)
    this.do_add_2_box=this.do_add_2_box.bind(this)
    this.do_add_2_box_through_pet=this.do_add_2_box_through_pet.bind(this)
    this.do_add_1_ocr=this.do_add_1_ocr.bind(this)
    this.do_add_1_ocr_through_pet=this.do_add_1_ocr_through_pet.bind(this)
    this.do_add_2_ocr=this.do_add_2_ocr.bind(this)
    this.do_add_2_ocr_through_pet=this.do_add_2_ocr_through_pet.bind(this)
    this.setMode=this.setMode.bind(this)
    this.getRedactionsFromCurrentFrameset=this.getRedactionsFromCurrentFrameset.bind(this)
    this.setProcessingEndSeconds=this.setProcessingEndSeconds.bind(this)
    this.setProcessingEndMinutes=this.setProcessingEndMinutes.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.gotoFramesetHash=this.gotoFramesetHash.bind(this)
    this.setScrubberValue=this.setScrubberValue.bind(this)
    this.afterMovieFetched=this.afterMovieFetched.bind(this)
    this.toggleShowStoryBoardVisibility=this.toggleShowStoryBoardVisibility.bind(this)
  }

  componentDidMount() {
    document.getElementById('movie_panel_link').classList.add('active')
    document.getElementById('movie_panel_link').classList.add('border-bottom')
    document.getElementById('movie_panel_link').classList.add('pb-0')
    this.scrubberOnChange()                                                     
    this.props.setActiveWorkflow('')
    this.addCallback({
      'add_1_box': this.do_add_1_box,
      'add_1_box_through_pet': this.do_add_1_box_through_pet,
      'add_2_box': this.do_add_2_box,
      'add_2_box_through_pet': this.do_add_2_box_through_pet,
      'add_1_ocr': this.do_add_1_ocr,
      'add_1_ocr_through_pet': this.do_add_1_ocr_through_pet,
      'add_2_ocr': this.do_add_2_ocr,
      'add_2_ocr_through_pet': this.do_add_2_ocr_through_pet,
    })
  }

  toggleShowStoryBoardVisibility() {
    const new_value = (!this.state.show_story_board)
    this.setState({
      show_story_board: new_value,
    })
  }

  afterMovieFetched() {
    this.scrubberOnChange()
  }

  setScrubberValue(the_number) {
    document.getElementById('movie_scrubber').value = the_number
    this.scrubberOnChange()
  }

  gotoFramesetHash(the_hash) {
    const frameset = this.props.movies[this.props.movie_url]['framesets'][the_hash]
    const image_url = frameset['images'][0]
    const nummy_as_string = image_url.split('_').slice(-1)[0]
    const frame_num = parseInt(nummy_as_string)
    this.setScrubberValue(frame_num)
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

  setProcessingEndSeconds(the_value) {
    this.setState({
      processing_end_seconds: the_value,
    })
  }

  setProcessingEndMinutes(the_value) {
    this.setState({
      processing_end_minutes: the_value,
    })
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
      movie_offset_seconds: offset_in_seconds,
    })
  }

  redactImage(areas_to_redact=null)  {
    if (!areas_to_redact) {
      areas_to_redact = this.getRedactionsFromCurrentFrameset()
    }
    if (areas_to_redact.length > 0) {
      this.submitMovieJob(
        'redact',
        {areas_to_redact: areas_to_redact}
      )
    } else {
      this.setMessage('Nothing to redact has been specified')
    }
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

  addRedactionToFrameset(areas_to_redact) {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.props.getCurrentFramesets()))
    deepCopyFramesets[this.props.active_frameset_hash]['areas_to_redact'] = areas_to_redact
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let cur_movie = deepCopyMovies[this.props.movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[this.props.movie_url] = cur_movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
  }

  setMode(the_mode) {
    const message = getMessage(the_mode)
    this.setMessage(message)
    this.setState({mode: the_mode})
  }

  do_add_1_box(cur_click) {
    this.setMode('add_2_box')
  }

  do_add_1_ocr(cur_click) {
    this.setMode('add_2_ocr')
  }

  do_add_1_box_through_pet(cur_click) {
    this.setMode('add_2_box_through_pet')
  }

  do_add_1_ocr_through_pet(cur_click) {
    this.setMode('add_2_ocr_through_pet')
  }

  do_add_2_box(cur_click) {
//    let deepCopyAreasToRedact = this.getRedactionsFromCurrentFrameset()
    const new_a2r = {
      start: [this.state.last_click[0], this.state.last_click[1]],
      end: cur_click,
      text: 'you got it hombre',
      source: 'manual',
      id: Math.floor(Math.random() * 1950960),
    }
//    deepCopyAreasToRedact.push(new_a2r)
    this.setMessage('region was successfully added, select another region to add')
//    this.addRedactionToFrameset(deepCopyAreasToRedact)
    this.redactImage([new_a2r])
    this.setState({mode: 'add_1_box'})
  }

  do_add_2_ocr(cur_click) {
    const ocr_rule = this.buildSingleUseOcrRule(this.state.last_click, cur_click)
    const movies = this.buildMoviesForSingleFrame()
    this.props.runOcrRedactPipelineJob(ocr_rule, movies)
    this.setState({mode: ''})
  }

  do_add_2_box_through_pet(cur_click) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let cur_movie = deepCopyMovies[this.props.movie_url]

    const start_offset_seconds = parseInt(this.state.movie_offset_seconds)
    const end_offset_seconds = (
      parseInt(this.state.processing_end_seconds)
      + 60*parseInt(this.state.processing_end_minutes)
    )

    if (start_offset_seconds >= end_offset_seconds) {
      this.setMessage('zero or negative time range selected, no redactions will be added')
      this.setState({
        mode: '',
      })
      return
    }

    let frameset_hashes_to_redact = []
    let cur_frame_url = ''
    let the_frameset_hash = ''
    for (let i=start_offset_seconds; i <= end_offset_seconds; i++) {
      if (i > cur_movie['frames'].length - 1) {
        break
      }
      cur_frame_url = cur_movie['frames'][i]
      the_frameset_hash = this.props.getFramesetHashForImageUrl(cur_frame_url)
      if (!frameset_hashes_to_redact.includes(the_frameset_hash)) {
        if (!Object.keys(cur_movie['framesets'][the_frameset_hash]).includes('areas_to_redact')) {
          cur_movie['framesets'][the_frameset_hash]['areas_to_redact'] = []
        }
        const new_a2r = {
          start: [this.state.last_click[0], this.state.last_click[1]],
          end: cur_click,
          text: 'you got it hombre',
          source: 'manual',
          id: Math.floor(Math.random() * 1950960),
        }
        cur_movie['framesets'][the_frameset_hash]['areas_to_redact'].push(new_a2r)
        frameset_hashes_to_redact.push(the_frameset_hash)
      }
    }

    this.props.setGlobalStateVar('movies', deepCopyMovies)

    this.submitMovieJob(
      'redact_box_multi_frameset',
      {
        movie: cur_movie,
        frameset_hashes: frameset_hashes_to_redact,
      },
    )
    this.setState({mode: ''})
  }

  do_add_2_ocr_through_pet(cur_click) {
    this.submitMovieJob(
      'scan_ocr',
      {current_click: cur_click},
    )
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

  scrubberOnChange(the_frameset_hash='', framesets='', frame_url='') {          
    const value = document.getElementById('movie_scrubber').value
    if (
      typeof the_frameset_hash === 'object'  // manually moving the scrubber yields an event 
      || (!the_frameset_hash && !framesets && !frame_url) // calling this method with empty parms
    ) {
      const frames = this.props.getCurrentFrames()
      framesets = this.props.getCurrentFramesets()
      frame_url = frames[value]
      the_frameset_hash = this.props.getFramesetHashForImageUrl(frame_url)
    }
    this.props.setFramesetHash(the_frameset_hash, framesets, (()=>{this.setImageSize(frame_url)}) )
    this.updateMovieOffsetMessage(value)
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
    if (!document.getElementById('movie_image')) {
      return
    }
    const scale = (document.getElementById('movie_image').width /
        document.getElementById('movie_image').naturalWidth)
    this.props.setGlobalStateVar('image_scale', scale)
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

  findFramesetAtOffset(offset) {
    const cur_movie_frames = this.props.movies[this.props.movie_url]['frames']
    let frame = ''
    if (offset > cur_movie_frames.length) {
      frame = cur_movie_frames[cur_movie_frames.length-1]
    } else {
      frame = cur_movie_frames[offset]
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(frame)
    this.setState({
      highlighted_frameset_hash: frameset_hash,
    })
  }

  componentWillUnmount() {                                                      
    document.getElementById('movie_panel_link').classList.remove('active')          
    document.getElementById('movie_panel_link').classList.add('border-0')           
    document.getElementById('movie_panel_link').classList.remove('pb-0')            
  }

  showMovieUploadOptions() {
    this.props.setGlobalStateVar('movie_url', '')
  }

  changeMovieResolutionNew(value) {
    this.setState({
      movie_resolution_new: value,
    })
  }

  changeFramesetOffsetSeconds(seconds) {
    this.setState({
      frameset_offset_seconds: seconds,
    })
  }

  changeFramesetOffsetMinutes(minutes) {
    this.setState({
      frameset_offset_minutes: minutes,
    })
  }

  buildTemplateMatchJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    let templates_wrap = {}
    if (extra_data === 'all_templates') {
      job_data['operation'] = 'scan_template_multi'
      job_data['description'] = 'multi template single movie match from MoviePanel:'
      job_data['description'] += ' movie ' + this.props.movie_url
      templates_wrap = this.props.templates
      const temp_group_id = 'template_group_' + Math.floor(Math.random(10000, 99999)*100000).toString()
      job_data['request_data']['id'] = temp_group_id
    } else {
      let template = this.props.templates[extra_data]
      job_data['operation'] = 'scan_template'
      job_data['description'] = 'single template single movie match from MoviePanel:'
      job_data['description'] += ' template ' + template['name']
      job_data['description'] += ' movie ' + this.props.movie_url
      templates_wrap[template['id']] = template
      job_data['request_data']['template_id'] = template['id']
      job_data['request_data']['id'] = template['id']
    }
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners']['template'] = templates_wrap
    job_data['request_data']['scan_level'] = 'tier_2'
    let movies_wrap = {}
    movies_wrap[this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['movies'] = movies_wrap
    return job_data
  }

  buildRedactFramesetsJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact'
    job_data['description'] = 'redact images for movie: ' + this.props.movie_url
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['redact_rule'] = this.props.redact_rule
    job_data['request_data']['meta'] = {
      return_type: 'url',
      preserve_working_dir_across_batch: true,
    }
    return job_data
  }

  buildRedactBoxMultiFramesetJobdata(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact'
    job_data['description'] = 'redact images for movie: ' + this.props.movie_url
    job_data['request_data']['movies'] = {}

    const cur_movie = extra_data['movie']
    let build_movie = JSON.parse(JSON.stringify(cur_movie))
    delete build_movie['framesets']
    build_movie['framesets'] = {}
    for (let i=0; i < extra_data['frameset_hashes'].length; i++) {
      const frameset_hash = extra_data['frameset_hashes'][i]
      build_movie['framesets'][frameset_hash] = cur_movie['framesets'][frameset_hash]
    }
    job_data['request_data']['movies'][this.props.movie_url] = build_movie

    job_data['request_data']['redact_rule'] = this.props.redact_rule
    job_data['request_data']['meta'] = {
      return_type: 'url',
      preserve_working_dir_across_batch: true,
    }
    return job_data
  }

  buildRedactedMovieFilename() {
    //TODO this is not friendly to file names with more than one period, or with a slash in them
    let parts = this.props.movie_url.split('/')
    let file_parts = parts[parts.length-1].split('.')
    let new_filename = file_parts[0] + '_redacted.' + file_parts[1]
    return new_filename
  }

  buildImageUrlsToZip(movie) {
    let image_urls = []
    for (let i=0; i < movie['frames'].length; i++) {
      const frame_image = movie['frames'][i]
      const frameset_hash = this.props.getFramesetHashForImageUrl(frame_image)
      if (frameset_hash) {
        if (Object.keys(movie['framesets'][frameset_hash]).includes('redacted_image')) {
          image_urls.push(movie['framesets'][frameset_hash]['redacted_image'])
        } else {
          image_urls.push(frame_image)
        }
      } else {
        console.log('PROBLEM: no frameset hash found for ' + frame_image)
      }
    }
    return image_urls
  }

  buildZipMovieJobdata() {
    let job_data = {
      request_data: {},
    }
    let movie = this.props.movies[this.props.movie_url]
    job_data['app'] = 'parse'
    job_data['operation'] = 'zip_movie'
    job_data['description'] = 'zip movie: ' + this.props.movie_url
    job_data['request_data']['new_movie_name'] = this.buildRedactedMovieFilename()
    job_data['request_data']['movie_url'] = this.props.movie_url
    if (Object.keys(movie).includes('audio_url')) {
        job_data['request_data']['audio_url'] = movie['audio_url']
    }
    const image_urls = this.buildImageUrlsToZip(movie) 
    job_data['request_data']['image_urls'] = image_urls
    return job_data
  }

  buildSplitAndHashJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_threaded'
    job_data['description'] = 'split and hash threaded from MoviePanel: ' + extra_data
    job_data['request_data']['movie_urls'] = [extra_data]
    job_data['request_data']['preserve_movie_audio'] = this.props.preserve_movie_audio
    job_data['request_data']['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  buildSplitJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_threaded'
    job_data['description'] = 'split movie from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {
      movie_url: this.props.movie_url,
      preserve_movie_audio: this.props.preserve_movie_audio,
    }
    return job_data
  }

  buildHashJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'hash_movie'
    job_data['description'] = 'hash movie from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {}
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['movies'][this.props.movie_url]['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  buildCopyJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'copy_movie'
    job_data['description'] = 'copy movie from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {}
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    return job_data
  }

  buildChangeResolutionJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'change_movie_resolution'
    job_data['description'] = 'change movie resolution from MoviePanel: movie ' + this.props.movie_url
    job_data['request_data'] = {}
    job_data['request_data']['movies'] = {}
    job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['resolution'] = this.state.movie_resolution_new
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

  buildMoviesForSingleFrame() {
    const image_url = this.props.getImageUrl()
    const frameset_hash = this.props.getFramesetHashForImageUrl(image_url)
    let movies = {}
    movies[this.props.movie_url] = {
      framesets: {},
      frames: [],
    }
    movies[this.props.movie_url]['framesets'][frameset_hash] = {images: []}
    movies[this.props.movie_url]['framesets'][frameset_hash]['images'].push(image_url)
    movies[this.props.movie_url]['frames'].push(image_url)
    return movies
  }

  afterSplitAndHashSubmitted(responseJson) {
    this.setMessage('movie split job was submitted')
    this.props.attachToJob(responseJson['job_id'])
  }

  submitMovieJob(job_string, extra_data = '') {
    if (job_string === 'split_and_hash_video') {
      const job_data = this.buildSplitAndHashJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: ((r) => {this.afterSplitAndHashSubmitted(r)}), 
        delete_job_after_loading: true, 
        attach_to_job: true, 
        after_loaded: () => {this.setMessage('movie split completed')}, 
        when_failed: () => {this.setMessage('movie split failed')},
      })
    } else if (job_string === 'split_movie') {
      const job_data = this.buildSplitJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie split job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('movie split completed')}, 
        when_failed: () => {this.setMessage('movie split failed')},
      })
    } else if (job_string === 'hash_movie') {
      const job_data = this.buildHashJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie hash job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('movie hash completed')}, 
        when_failed: () => {this.setMessage('movie hash failed')},
      })
    } else if (job_string === 'copy_movie') {
      const job_data = this.buildCopyJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie copy job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('movie copy completed')}, 
        when_failed: () => {this.setMessage('movie copy failed')},
      })
    } else if (job_string === 'change_movie_resolution') {
      if (!this.state.movie_resolution_new) {
        this.setMessage('no resolution specified, please specify one first')
        return
      }
      const job_data = this.buildChangeResolutionJobData(extra_data)
      this.props.submitJob({
        job_data:job_data, 
        after_submit: () => {this.setMessage('movie change resolution was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('movie change resolution completed')}, 
        when_failed: () => {this.setMessage('movie change resolution failed')},
      })
    } else if (job_string === 'redact_framesets') {
      const job_data = this.buildRedactFramesetsJobData(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('redact frames job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('frameset redactions completed')}, 
        when_failed: () => {this.setMessage('redact frames job failed')},
      })
    } else if (job_string === 'template_match') {
      const job_data = this.buildTemplateMatchJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('template match job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('template match completed')}, 
        when_failed: () => {this.setMessage('template match job failed')},
      })
    } else if (job_string === 'template_match_all_templates') {
      const job_data = this.buildTemplateMatchJobdata('all_templates')
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('template match job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('template match completed')}, 
        when_failed: () => {this.setMessage('template match job failed')},
      })
    } else if (job_string === 'zip_movie') {
      const job_data = this.buildZipMovieJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data, 
        after_submit: () => {this.setMessage('zip movie job was submitted')}, 
        delete_job_after_loading: true, 
        after_loaded: () => {this.setMessage('movie zip completed')}, 
        when_failed: () => {this.setMessage('zip movie job failed')},
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
    } else if (job_string === 'redact_box_multi_frameset') {
      const job_data = this.buildRedactBoxMultiFramesetJobdata(extra_data)
      this.props.submitJob({
        job_data: job_data,
        after_submit: () => {this.setMessage('redact job was submitted')},
        delete_job_after_loading: true,
        after_loaded: () => {this.setMessage('redact completed')},
        when_failed: () => {this.setMessage('redact failed')},
      }) 
    } else if (job_string === 'movie_panel_redact_and_reassemble_video') {
      console.log('redact and reassemble called - NOT SUPPORTED YET')
    }
  }

  setMessage(the_message) {
    this.props.setGlobalStateVar('message', the_message)
  }

  setDraggedId = (the_id) => {
    this.setState({
      draggedId: the_id,
    })
  }

  handleDroppedFrameset = (target_id) => {
    this.props.handleMergeFramesets(target_id, this.state.draggedId)
  }

  redactFramesetCallback = (frameset_hash) => {
    this.props.setFramesetHash(frameset_hash)
    const link_to_next_page = document.getElementById('image_panel_link')
    link_to_next_page.click()
  }

  imageUrlHasRedactionInfo = (image_url) => {
    let frameset_hash = this.props.getFramesetHashForImageUrl(image_url)
    let areas_to_redact = this.props.getRedactionFromFrameset(frameset_hash)
    if (areas_to_redact.length > 0) {
        return true
    }
    return false
  }

  getNameFor(image_name) {
    let s = image_name.substring(image_name.lastIndexOf('/')+1, image_name.length);
    s = s.substring(0, s.indexOf('.'))
    return s
  }

  handleDroppedMovie(event) {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      for (let i=0; i < event.dataTransfer.files.length; i++) {
        this.handleDownloadedFile(event.dataTransfer.files[i])
      }
    }
  }

  async handleDownloadedFile(the_file) {
    let reader = new FileReader()
    let app_this = this
    reader.onload = function(e) {
      app_this.props.postMakeUrlCall({
        data_uri: e.target.result,
        filename: the_file.name,
        when_done: ((x)=>{app_this.props.establishNewMovie(x)}),
        when_failed: (err) => {app_this.setMessage('make url job failed')}, 
      })
    }
    reader.readAsDataURL(the_file)
    this.setState({
      uploadMovie: false,
    })
  }

  buildImageDiv() {
    const image_url = this.props.getImageUrl()
    if (!image_url) {
      let message = 'No movie loaded yet'
      if (this.props.movie_url) {
        message = 'movie loaded, but not yet split'
      }
      const the_style = {
        'height': '500px',
        'width': '1000px',
        'top': '100px',
        'paddingTop': '200px',
      }
      return (
        <div
            className='h1 text-center'
            style={the_style}
        >
          {message}
        </div>
      )
    }

    return (
      <div>
        <img
            id='movie_image'
            className='p-0 m-0 mw-100'
            src={image_url}
            alt={image_url}
        />
      </div>
    )
  }

  getMaxRange() {
    if (
      !this.props.movies 
      || !this.props.movie_url 
      || (!Object.keys(this.props.movies).includes(this.props.movie_url))
    ) {
      return 1
    }
    const movie = this.props.movies[this.props.movie_url]
    const max_len = movie['frames'].length - 1
    return max_len
  }

  buildMovieScrubber() {
    const max_range = this.getMaxRange()
    let the_style = {
      width: '100%',
    }
    if (!this.props.getImageUrl()) {
      the_style['display'] = 'none'
    }
    return (
      <div>
      <input
        id='movie_scrubber'
        type='range'
        style={the_style}
        max={max_range}
        defaultValue='0'
        onChange={this.scrubberOnChange}
      />
      </div>
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

  buildFetchAndSplit() {
    if (this.props.movie_url) {
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
                this.props.dispatchFetchSplitAndHash(
                  document.getElementById('recording_id').value, 
                  true,
                  this.afterMovieFetched
                )
              }
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  render() {
    const image_div = this.buildImageDiv()
    const movie_scrubber = this.buildMovieScrubber()
    const position_label = this.buildPositionLabel()
    const movie_load_dialog = this.buildFetchAndSplit()
    return  (
      <div className='col'>

        <div className='row'>
          <div className='col-11 m-2'>
            <MoviePanelHeader
              callMovieSplit={this.callMovieSplit}
              message={this.props.message}
              submitMovieJob={this.submitMovieJob}
              movie_url={this.props.movie_url}
              showMovieUploadOptions={this.showMovieUploadOptions}
            />
          </div>
          <div className='col-1'>
            <JobBug
              jobs={this.props.jobs}
              attached_job={this.props.attached_job}
            />
          </div>
        </div>

        <div className='row m-2'>
          <div className='col-10'>
            <div className='row'>
              {image_div}
              <CanvasMovieOverlay
                getImageUrl={this.props.getImageUrl}
                image_width={this.props.image_width}
                image_height={this.props.image_height}
                image_scale={this.props.image_scale}
                show_redaction_borders={this.props.visibilityFlags.redaction_borders}
                last_click={this.state.last_click}
                oval_center= {this.state.oval_center}
                mode={this.state.mode}
                clickCallback= {this.handleImageClick}
                getRedactionsFromCurrentFrameset={this.getRedactionsFromCurrentFrameset}
                getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
                getCurrentTemplateMaskZones={this.getCurrentTemplateMaskZones}
                currentImageIsTemplateAnchorImage={this.currentImageIsTemplateAnchorImage}
                handleDroppedMovie={this.handleDroppedMovie}
                movie_url={this.props.movie_url}
              />
            </div>
          </div>
        </div>

        <div className='row m-2'>
          <div className='col'>
            {position_label}
            {movie_scrubber}
            {movie_load_dialog}
          </div>
        </div>

        <div className='row m-2'>
          <MovieImageControls
            getImageUrl={this.props.getImageUrl}
            setMessage={this.setMessage}
            setMode={this.setMode}
            templates={this.props.templates}
            processing_end_seconds={this.props.processing_end_seconds}
            processing_end_minutes={this.props.processing_end_minutes}
            clearCurrentFramesetChanges={this.props.clearCurrentFramesetChanges}
            runTemplateRedactPipelineJob={this.props.runTemplateRedactPipelineJob}
            setProcessingEndSeconds={this.setProcessingEndSeconds}
            setProcessingEndMinutes={this.setProcessingEndMinutes}
          />
        </div>

        <div className='row m-2 bg-light rounded'>
          <MoviePanelAdvancedControls
            movie_url={this.props.movie_url}
            movies={this.props.movies}
            setMessage={this.setMessage}
            getRedactedMovieUrl={this.props.getRedactedMovieUrl}
            setGlobalStateVar={this.props.setGlobalStateVar}
            toggleGlobalStateVar={this.props.toggleGlobalStateVar}
            submitMovieJob={this.submitMovieJob}
            redact_rule={this.props.redact_rule}
            frameset_discriminator={this.props.frameset_discriminator}
            changeMovieResolutionNew={this.changeMovieResolutionNew}
            movie_resolution_new={this.state.movie_resolution_new}
            preserve_movie_audio={this.props.preserve_movie_audio}
            frameset_offset_seconds={this.state.frameset_offset_seconds}
            frameset_offset_minutes={this.state.frameset_offset_minutes}
            changeFramesetOffsetSeconds={this.changeFramesetOffsetSeconds}
            changeFramesetOffsetMinutes={this.changeFramesetOffsetMinutes}
            findFramesetAtOffset={this.findFramesetAtOffset}
            visibilityFlags={this.props.visibilityFlags}
            toggleShowVisibility={this.props.toggleShowVisibility}
          />
        </div>

        <div className='row m-2 bg-light rounded'>
          <FramesetCardList 
            getCurrentFramesets={this.props.getCurrentFramesets}
            getNameFor={this.getNameFor}
            redactFramesetCallback={this.redactFramesetCallback}
            getRedactionFromFrameset={this.props.getRedactionFromFrameset}
            setDraggedId={this.setDraggedId}
            handleDroppedFrameset={this.handleDroppedFrameset}
            getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
            getImageFromFrameset={this.props.getImageFromFrameset}
            getRedactedImageFromFrameset={this.props.getRedactedImageFromFrameset}
            highlighted_frameset_hash={this.state.highlighted_frameset_hash}
            gotoFramesetHash={this.gotoFramesetHash}
            show_story_board={this.state.show_story_board}
            toggleShowStoryBoardVisibility={this.toggleShowStoryBoardVisibility}
          />
        </div>

        <div className='row m-2 bg-light rounded'>
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
            collapsible={true}
          />
        </div>

      </div>
    )
  }
}

class MoviePanelAdvancedControls extends React.Component {
  buildFramesetDiscriminatorDropdown() {
    const frameset_discriminator_select = buildFramesetDiscriminatorSelect(
      'frameset_discriminator',
      this.props.frameset_discriminator,
      ((event) => 
        this.props.setGlobalStateVar(
          'frameset_discriminator',
          event.target.value,
          this.props.setMessage('framework discriminator updated')
        )
      )
    )

    return (
      <div
          className='d-inline ml-2 mt-2'
      >
        {frameset_discriminator_select}
      </div>
    )
  }

  buildRedactedMovieDownloadLink() {
    const red_mov_url = this.props.getRedactedMovieUrl()
    if (red_mov_url) {
      return (
        <a 
            href={red_mov_url}
            download={red_mov_url}
        >
          download redacted movie
        </a>
      )
    }
  }

  buildSplitButton() {
    return (
      <button className='btn btn-primary'
          key='5558'
          onClick={() => this.props.submitMovieJob('split_movie')}
          href='.'>
        Split Movie
      </button>
    )
  }

  buildHashButton() {
    return (
      <button className='btn btn-primary'
          key='5559'
          onClick={() => this.props.submitMovieJob('hash_movie')}
          href='.'>
        Hash Movie
      </button>
    )
  }

  buildCopyButton() {
    return (
      <button className='btn btn-primary'
          key='5279'
          onClick={() => this.props.submitMovieJob('copy_movie')}
          href='.'>
        Copy Movie
      </button>
    )
  }

  buildChangeResolutionButton() {
    return (
      <div>
        <div className='d-inline'>
          Change Resolution
        </div>

        <div className='d-inline ml-2'>
          <select
              name='movie_resolution'
              value={this.props.movie_resolution_new}
              onChange={(event) => this.props.changeMovieResolutionNew(event.target.value)}
          >
            <option value=''></option>
            <option value='1920x1080'>1920x1080</option>
            <option value='1600x900'>1600x900</option>
          </select>
        </div>

        <div className='d-inline ml-2'>
          <button className='btn btn-primary'
              key='4294'
              onClick={() => this.props.submitMovieJob('change_movie_resolution')}
              href='.'>
            Go
          </button>
        </div>
      </div>
    )
  }

  buildPreserveMovieAudioCheckbox() {
    let checked_state = ''
    if (this.props.preserve_movie_audio) {
      checked_state = 'checked'
    }
    return (
      <div className='row mt-3 bg-light rounded'>
        <input
          className='ml-2 mr-2 mt-1'
          id='toggle_preserve_movie_audio'
          checked={checked_state}
          type='checkbox'
          onChange={(event) => this.props.toggleGlobalStateVar('preserve_movie_audio')}
        />
        Preserve Movie Audio
      </div>
    )
  }

  buildFindFramesetAtOffsetButton() {
    let sixty_element_array = []
    for (let i = 0; i < 61; i++) {
      sixty_element_array.push(i)
    }
    let prev_offset = 0
    const cur_offset_sec = parseInt(this.props.frameset_offset_seconds)
    const cur_offset_min = parseInt(this.props.frameset_offset_minutes) * 60
    const cur_offset = cur_offset_sec + cur_offset_min
    if (cur_offset > 0) {
      prev_offset = cur_offset - 1
    }
    const next_offset = cur_offset + 1
    return (
      <div>
        <div className='d-inline'>
          Highlight Frameset at Offset
        </div>

        <div className='d-inline ml-2'>
          <select
              name='frameset_offset_minutes'
              value={this.props.frameset_offset_minutes}
              onChange={(event) => this.props.changeFramesetOffsetMinutes(event.target.value)}
          >
            {sixty_element_array.map((value, index) => {
              const key = 'frameset_offst_minutes_' + index.toString()
              return (
                <option key={key} value={value}>{value}</option>
              )
            })}
          </select>
        </div>
        <div className='d-inline ml-1'>
          min
        </div>

        <div className='d-inline ml-2'>
          <select
              name='frameset_offset_seconds'
              value={this.props.frameset_offset_seconds}
              onChange={(event) => this.props.changeFramesetOffsetSeconds(event.target.value)}
          >
            {sixty_element_array.map((value, index) => {
              const key = 'frameset_offst_seconds_' + index.toString()
              return (
                <option key={key} value={value}>{value}</option>
              )
            })}
          </select>
        </div>
        <div className='d-inline ml-1'>
          sec
        </div>

        <div className='d-inline ml-2'>
          <button className='btn btn-primary'
              key='find_frameset_at_offset_go_button'
              onClick={() => this.props.findFramesetAtOffset(cur_offset)}
              href='.'>
            Go
          </button>
          <button className='btn btn-primary ml-2'
              key='find_frameset_at_offset_prev_button'
              onClick={() => this.gotoOffsetAndSet(prev_offset)}
              href='.'>
            Prev
          </button>
          <button className='btn btn-primary ml-2'
              key='find_frameset_at_offset_next_button'
              onClick={() => this.gotoOffsetAndSet(next_offset)}
              href='.'>
            Next
          </button>
        </div>
      </div>
    )
  }

  gotoOffsetAndSet(the_offset) {
    this.props.findFramesetAtOffset(the_offset)
    const offset_sec = the_offset % 60
    const offset_min = Math.floor(the_offset / 60)
    this.props.changeFramesetOffsetSeconds(offset_sec)
    this.props.changeFramesetOffsetMinutes(offset_min)
  }

  buildShowRedactionBordersCheckbox() {
    let show_redaction_borders_checked = ''
    if (this.props.visibilityFlags['redaction_borders']) {
      show_redaction_borders_checked = 'checked'
    }
    return (
      <div className='row mt-3 bg-light rounded'>
        <input
          className='ml-2 mr-2 mt-1'
          checked={show_redaction_borders_checked}
          type='checkbox'
          onChange={() => this.props.toggleShowVisibility('redaction_borders')}
        />
        Show Redaction Borders
      </div>
    )
  }

  setGlobalMaskMethod(mask_method) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['mask_method'] = mask_method
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  setGlobalReplaceWith(the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['replace_with'] = the_value
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  setGlobalErodeIterations(the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['erode_iterations'] = the_value
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  setGlobalBucketCloseness(the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['bucket_closeness'] = the_value
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  render() {
    if (this.props.movie_url === '') {
      return ''
    }
    let frameset_discriminator = ''
    let runtime = '0:00'
    let nickname = ''
    let num_framesets = '0'
    let num_frames = '0'
    let redacted = 'No'
    let frame_dimensions = 'unknown'
    const split_button = this.buildSplitButton()
    const hash_button = this.buildHashButton()
    const copy_button = this.buildCopyButton()
    const change_button = this.buildChangeResolutionButton()
    const redacted_movie_dl_link = this.buildRedactedMovieDownloadLink()
    const preserve_movie_audio_checkbox = this.buildPreserveMovieAudioCheckbox() 
    const find_frameset_at_offset_button = this.buildFindFramesetAtOffsetButton()
    const show_redaction_borders = this.buildShowRedactionBordersCheckbox()

    const fd_dropdown = this.buildFramesetDiscriminatorDropdown()
    if (this.props.movie_url && Object.keys(this.props.movies).includes(this.props.movie_url)) {
      const movie = this.props.movies[this.props.movie_url]
      frameset_discriminator = movie['frameset_discriminator']
      num_frames = movie['frames'].length
      num_framesets = Object.keys(movie['framesets']).length.toString()
      const num_mins = Math.floor(num_frames / 60)
      const num_secs = num_frames % 60
      if (Object.keys(movie).includes('frame_dimensions')) {
        frame_dimensions = movie['frame_dimensions'][0] + 'x' + movie['frame_dimensions'][1]
      }
      let num_secs_string = num_secs.toString()
      if (num_secs_string.length === 1) {
        num_secs_string = '0' + num_secs_string
      }
      runtime = num_mins.toString() + ':' + num_secs_string
      nickname = movie.nickname
      const red_mov_url = this.props.getRedactedMovieUrl()
      if (red_mov_url) {
        redacted = 'Yes'
      }
    }

    const redaction_mask_method = buildRedactionTypeSelect(
      'mask_method',
      this.props.redact_rule.mask_method,
      ((event) => this.setGlobalMaskMethod(event.target.value))
    )

    const redaction_replace_with = buildRedactionReplaceWithSelect(
      'replace_with',
      this.props.redact_rule,
      ((event) => this.setGlobalReplaceWith(event.target.value))
    )

    const redaction_erode_iterations = buildRedactionErodeIterationsSelect(
      'erode_iterations',
      this.props.redact_rule,
      ((event) => this.setGlobalErodeIterations(event.target.value))
    )

    const redaction_bucket_closeness = buildRedactionBucketClosenessSelect(
      'bucket_closeness',
      this.props.redact_rule,
      ((event) => this.setGlobalBucketCloseness(event.target.value))
    )

    return (
      <div className='col border pt-2 pb-2'>
        <div className='row'>
          
          <div
            className='col-lg-10 h3 float-left'
          >
            Movie Info
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
            <div id='movie_info_div m-2'>
              <div>Movie Url: {this.props.movie_url}</div>
              <div>Nickname: {nickname}</div>
              <div>Number of frames: {num_frames.toString()}</div>
              <div>Number of framesets: {num_framesets}</div>
              <div>Run Time: {runtime}</div>
              <div>Movie Redacted? {redacted}</div>
              <div>Frameset Discriminator: {frameset_discriminator}</div>
              <div>Frame Dimensions: {frame_dimensions}</div>
              <div>
                {redacted_movie_dl_link}
              </div>
            </div>
            <div 
                className='border-top p-2'
                id='movie_controls_div_secondary'
            >
              <div>
                <span>set frameset discriminator</span>
                {fd_dropdown}
              </div>

              <div>
                <div className='d-inline'>
                  set redaction mask method
                </div>
                <div className='d-inline ml-2'>
                  {redaction_mask_method}
                </div>
              </div>

              {redaction_replace_with}
              {redaction_erode_iterations}
              {redaction_bucket_closeness}

              <div className='mt-2'>
                <div className='d-inline'>
                  {split_button}
                </div>
                <div className='d-inline ml-2'>
                  {hash_button}
                </div>
                <div className='d-inline ml-2'>
                  {copy_button}
                </div>
              </div>

              <div className='mt-2 ml-2'>
                {change_button}
              </div>
              <div className='mt-2 ml-2'>
                {find_frameset_at_offset_button}
              </div>
              <div className='mt-2 ml-2'>
                {preserve_movie_audio_checkbox}
              </div>
              <div className='mt-2 ml-2'>
                {show_redaction_borders}
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }
}

class MoviePanelHeader extends React.Component {
  buildMessage() {
      if (
        this.props.message === '.'
        || this.props.message === ''
      ) {
      return (
        <div className='text-white'>
          .
        </div>
      )
    } else {
      return this.props.message
    }
  }

  buildSplitButton() {
    if (this.props.movie_url === '') {
      return ''
    }
    return (
      <button 
          id='parse_video_button'
          className='btn btn-primary' 
          onClick={
            () => this.props.submitMovieJob(
              'split_and_hash_video', 
              this.props.movie_url
            )
          }
      >
        Split and Hash
      </button>
    )
  }

  buildReassembleButton() {
    if (this.props.movie_url === '') {
      return ''
    }
    return (
      <button 
          id='reassemble_video_button'
          className='btn btn-primary ml-2' 
          onClick={() => this.props.submitMovieJob('zip_movie')}
      >
        Reassemble Video
      </button>
    )
  }

  buildNewButton() {
    if (!this.props.movie_url) {
      return ''
    }
    return (
      <button 
          className='btn btn-primary ml-2' 
          onClick={() => this.props.showMovieUploadOptions()}
      >
        New
      </button>
    )
  }

  render() {
    let message = this.buildMessage()
    let split_button = this.buildSplitButton()
    let reassemble_button = this.buildReassembleButton()
    let new_button = this.buildNewButton()

    return (
      <div className='col'>
        <div className='row'>
          {split_button}
          {reassemble_button}
          {new_button}
        </div>

        <div className='row'>
          <div 
              id='movieparser_status'
              className='col-md-6 mt-2'
          >
            {message}
          </div>
        </div>
      </div>
    )
  }
}

export default MoviePanel;
