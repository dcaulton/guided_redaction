import React from 'react'
import CanvasInsightsOverlay from './CanvasInsightsOverlay'
import BottomInsightsControls from './BottomInsightsControls'
import JobCardList from './JobCards'
import MovieCardList from './MovieCards'

class InsightsPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: 'view',
      currentCampaign: '',
      campaigns: [],
      frameset_starts: {},
      insights_image: '',
      image_width: 1000,
      image_height: 1000,
      insights_image_scale: 1,
      insights_title: 'Insights, load a movie to get started',
      insights_message: '',
      prev_coords: (0,0),
      clicked_coords: (0,0),
      selected_area_template_anchor: '',
      draggedId: null,
      visibilityFlags: {
        'templates': true,
        'selectedArea': true,
        'annotate': true,
        'telemetry': true,
        'filesystem': true,
        'ocr': true,
        'movieSets': true,
        'results': true,
        'diffs': true,
        'pipelines': true,
      },
      imageTypeToDisplay: '',
      callbacks: {},
    }
    this.getSelectedAreas=this.getSelectedAreas.bind(this)
    this.getAnnotations=this.getAnnotations.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.getTemplateMatches=this.getTemplateMatches.bind(this)
    this.clearSelectedAreas=this.clearSelectedAreas.bind(this)
    this.getMovieMatchesFound=this.getMovieMatchesFound.bind(this)
    this.getMovieDiffsFound=this.getMovieDiffsFound.bind(this)
    this.getMovieSelectedCount=this.getMovieSelectedCount.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.afterArrowFill=this.afterArrowFill.bind(this)
    this.afterPingSuccess=this.afterPingSuccess.bind(this)
    this.afterPingFailure=this.afterPingFailure.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.callPing=this.callPing.bind(this)
    this.submitInsightsJob=this.submitInsightsJob.bind(this)
    this.setSelectedAreaTemplateAnchor=this.setSelectedAreaTemplateAnchor.bind(this)
    this.getCurrentSelectedAreaMeta=this.getCurrentSelectedAreaMeta.bind(this)
    this.displayInsightsMessage=this.displayInsightsMessage.bind(this)
    this.saveAnnotation=this.saveAnnotation.bind(this)
    this.deleteAnnotation=this.deleteAnnotation.bind(this)
    this.handleKeyDown=this.handleKeyDown.bind(this)
    this.setKeyDownCallback=this.setKeyDownCallback.bind(this)
    this.keyDownCallbacks = {}
    this.setDraggedId=this.setDraggedId.bind(this)
    this.toggleShowVisibility=this.toggleShowVisibility.bind(this)
    this.loadInsightsJobResults=this.loadInsightsJobResults.bind(this)
    this.afterMovieSplitInsightsJobLoaded=this.afterMovieSplitInsightsJobLoaded.bind(this)
    this.blinkDiff=this.blinkDiff.bind(this)
    this.setImageTypeToDisplay=this.setImageTypeToDisplay.bind(this)
    this.addInsightsCallback=this.addInsightsCallback.bind(this)
  }


  addInsightsCallback(the_key, the_callback) {
    let deepCopyCallbacks = JSON.parse(JSON.stringify(this.state.callbacks))
    deepCopyCallbacks[the_key] = the_callback
    this.setState({
      callbacks: deepCopyCallbacks,
    })
  }

  setImageTypeToDisplay(the_type) {
    console.log('image type to display is '+the_type)
    this.setState({
      imageTypeToDisplay: the_type,
    })
  }

  blinkDiff(blink_status) {
    if (blink_status === 'off') {
      this.scrubberOnChange()
      document.getElementById('movie_scrubber').focus()
      return
    }
    const cur_hash = this.getScrubberFramesetHash() 
    const cur_frameset = this.props.movies[this.props.movie_url]['framesets'][cur_hash]
    if (Object.keys(cur_frameset).includes('filtered_image_url')) {
      const filtered_image_url = cur_frameset['filtered_image_url']
      this.setState({
        insights_image: filtered_image_url,
      })
    }
    document.getElementById('movie_scrubber').focus()
  }

  loadInsightsJobResults(job_id) {
    const job = this.getJobForId(job_id)
    if ((job.app === 'parse' && job.operation === 'split_and_hash_movie') 
       || (job.app === 'parse' && job.operation === 'split_and_hash_threaded')) {
      this.props.loadJobResults(
        job_id, 
        this.afterMovieSplitInsightsJobLoaded
      )
    } else {
      this.props.loadJobResults(job_id) 
    }
  }

  doSleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  getJobForId(job_id) {
    for (let i=0; i < this.props.jobs.length; i++) {
      if (this.props.jobs[i]['id'] === job_id) {
        return this.props.jobs[i]
      }
    }
  }

  afterMovieSplitInsightsJobLoaded(framesets) {
    this.displayInsightsMessage('insights job loaded')
    this.movieSplitDone(framesets)
  }

  toggleShowVisibility(flag_name) {
    let deepCopyVisibilityFlags= JSON.parse(JSON.stringify(this.state.visibilityFlags))
    if (Object.keys(deepCopyVisibilityFlags).includes(flag_name)) {
      const new_value = (!deepCopyVisibilityFlags[flag_name])
      deepCopyVisibilityFlags[flag_name] = new_value
    }
    this.setState({
      visibilityFlags: deepCopyVisibilityFlags,
    })
  }

  componentDidMount() {
    this.props.checkAndUpdateApiUris()
    this.scrubberOnChange()
    if (Object.keys(this.props.getCurrentFramesets()).length > 0) {
      this.movieSplitDone(this.props.getCurrentFramesets())
    }
    this.props.getJobs()
    this.props.getWorkbooks()
  }

  setDraggedId = (the_id) => {
    this.setState({
      draggedId: the_id,
    })
  }

  setKeyDownCallback(key_code, the_function) {
    this.keyDownCallbacks[key_code] = the_function
  }
  
  handleKeyDown(e) {
    if (this.state.mode === 'add_annotations_interactive') {
      for (let i=0; i < Object.keys(this.keyDownCallbacks).length; i++) {
        let key = parseInt(Object.keys(this.keyDownCallbacks)[i], 10)
        if (e.keyCode === key) {
          this.keyDownCallbacks[key]()
        }
      }
    }
  }

  getCurrentSelectedAreaMeta() {
    if (this.props.current_selected_area_meta_id && 
        Object.keys(this.props.selected_area_metas).includes(
          this.props.current_selected_area_meta_id
        )) {
      return this.props.selected_area_metas[this.props.current_selected_area_meta_id]
    }
    return {}
  }

  setSelectedAreaTemplateAnchor(the_anchor_id) {
    this.setState({
      selected_area_template_anchor: the_anchor_id,
    })
  }

  buildScanTemplateCurTempCurMovJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template'
    job_data['description'] = 'single template single movie match'
    let template = this.props.templates[this.props.current_template_id]
    job_data['request_data']['template'] = template
    job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
    job_data['request_data']['template_id'] = template['id']
    const wrap = {}
    wrap[this.props.movie_url] = this.props.movies[this.props.movie_url]
    job_data['request_data']['target_movies'] = wrap
    return job_data
  }

  buildScanTemplateCurTempAllMovJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    const num_movies = Object.keys(this.props.movies).length.toString()
    let num_frames = 0
    let keys = Object.keys(this.props.movies)
    for (let i=0; i < keys.length; i++) {
        const movie = this.props.movies[keys[i]]
        const num_frameset_keys = Object.keys(movie['framesets']).length
        num_frames += num_frameset_keys
    }
    num_frames = num_frames.toString()
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template_threaded'
    job_data['description'] = 'single template '+ num_movies+ ' movies, ('+num_frames+' framesets)  match - threaded'
    let template = this.props.templates[this.props.current_template_id]
    job_data['request_data']['template'] = template
    job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
    job_data['request_data']['target_movies'] = this.props.movies
    return job_data
  }

  buildScanTemplateCurTempMovSetJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    const movie_set_name = this.props.movie_sets[extra_data]['name']
    let num_movies = this.props.movie_sets[extra_data]['movies'].length.toString()
    let movies_to_run = {}
    for (let i=0; i < this.props.movie_sets[extra_data]['movies'].length; i++) {
      const movie_url = this.props.movie_sets[extra_data]['movies'][i]
      movies_to_run[movie_url] = this.props.movies[movie_url]
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template_threaded'
    let template = this.props.templates[this.props.current_template_id]
    job_data['description'] = 'single template (' + template['name'] + ') '+ num_movies+ ' movies (from MovieSet ' + movie_set_name + '), match - threaded'
    job_data['request_data']['template'] = template
    job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
    job_data['request_data']['target_movies'] = movies_to_run
    return job_data
  }

  buildLoadMovieJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_threaded'
    job_data['description'] = 'split and hash threaded: ' + extra_data
//    job_data['operation'] = 'split_and_hash_movie'
//    job_data['description'] = 'split and hash movie: ' + extra_data
    job_data['request_data']['movie_url'] = extra_data
    job_data['request_data']['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  buildCalcDiffsData(job_type, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'filter'
    if (job_type === 'current_movie') {
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['description'] = 'calc diffs for movie: ' + this.props.movie_url
    } else if (job_type === 'all_movies') {
      job_data['request_data']['movies'] = this.props.movies
      job_data['description'] = 'calc diffs for all movies'
    }
    job_data['request_data']['filter_parameters'] = {
      'filter_operation': 'diff',
    }
    return job_data
  }

  buildTelemetryData(job_type, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'telemetry_find_matching_frames'
    job_data['request_data']['telemetry_data'] = this.props.telemetry_data
    job_data['request_data']['telemetry_rule'] = this.props.telemetry_rules[this.props.current_telemetry_rule_id]
    if (job_type === 'current_movie') {
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['description'] = 'telemetry, find matching frames for movie: ' + this.props.movie_url
    } else if (job_type === 'all_movies') {
      job_data['request_data']['movies'] = this.props.movies
      job_data['description'] = 'telemetry, find matching frames for all movies'
    }
    return job_data
  }

  submitInsightsJob(job_string, extra_data) {
    if (job_string === 'current_template_current_movie') {
      let job_data = this.buildScanTemplateCurTempCurMovJobData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_all_movies') {
      let job_data = this.buildScanTemplateCurTempAllMovJobData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_movie_set') {
      let job_data = this.buildScanTemplateCurTempMovSetJobData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'load_movie') {
      let job_data = this.buildLoadMovieJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'diffs_current_movie') {
      let job_data = this.buildCalcDiffsData('current_movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'telemetry_current_movie') {
      let job_data = this.buildTelemetryData('current_movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'telemetry_all_movies') {
      let job_data = this.buildTelemetryData('all_movies', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'diffs_all_movies') {
      let job_data = this.buildCalcDiffsData('all_movies', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    }
  }

  
  getCurrentTemplateMaskZones() {
    if (Object.keys(this.props.templates).includes(this.props.current_template_id)) {
      return this.props.templates[this.props.current_template_id]['mask_zones']
    } else {
      return []
    }
  }

  currentImageIsTemplateAnchorImage() {
    if (this.props.current_template_id) {
      let key = this.props.current_template_id
      if (!Object.keys(this.props.templates).includes(key)) {
        return false
      }
      let template = this.props.templates[key]
      if (!Object.keys(template).includes('anchors')) {
        return false
      }
      if (!template['anchors'].length) {
        return false
      }
      let cur_template_anchor_image_name = template['anchors'][0]['image']
      return (cur_template_anchor_image_name === this.state.insights_image)
    }
    return false
  }

  getMovieMatchesFound(movie_url) {
    const template_matches = this.props.getCurrentTemplateMatches()
    if (!Object.keys(template_matches).includes(this.props.current_template_id)) {
      return ''
    }
    const cur_templates_matches = template_matches[this.props.current_template_id]
    if (!Object.keys(cur_templates_matches).includes(movie_url)) {
      return ''
    }
    const cur_movies_matches = cur_templates_matches[movie_url]
    let count = Object.keys(cur_movies_matches).length
    if (count) {
      return count.toString() + ' template matches'
    } else {
      return ''
    }
  }

  getMovieDiffsFound(movie_url) {
    if (Object.keys(this.props.movies).includes(movie_url)) {
      for (let i=0; i < Object.keys(this.props.movies[movie_url]['framesets']).length; i++) {
        const frameset_hash = Object.keys(this.props.movies[movie_url]['framesets'])[i]
          const frameset = this.props.movies[movie_url]['framesets'][frameset_hash]
          if (Object.keys(frameset).includes('filtered_image_url') && 
              frameset['filtered_image_url']) {
            return 'diff images exist'
          }
      }
    }
    return ''
  }

  getMovieSelectedCount(movie_url) {
    // returns the number of images from this movie with at least one selected region 
    if (Object.keys(this.props.selected_areas).includes(movie_url)) {
      const  sa_count = Object.keys(this.props.selected_areas[movie_url]).length
      const ret_str = sa_count.toString() + ' with selected areas'
      return ret_str
    }
    return ''
  }

  callPing() {
    this.props.doPing(this.afterPingSuccess, this.afterPingFailure)
  }

  afterPingSuccess(responseJson) {
    if (responseJson.response === 'pong') {
      this.displayInsightsMessage('ping succeeded')
    } else {
      this.displayInsightsMessage('unexpected ping response, could be failure')
    }
  }

  afterPingFailure(error) {
    console.error(error);
    this.displayInsightsMessage('ping failed')
  }

  changeCampaign = (newCampaignName) => {
    console.log('campaign is now '+newCampaignName)
  }

  handleSetMode(the_mode) {
    let the_message = ''
    if (the_mode === 'add_template_anchor_1') {
      the_message = 'Select the first corner of the Region of Interest'
    } else if (the_mode === 'add_template_anchor_3') {
      the_message = "Anchor was successfully added"
    } else if (the_mode === 'add_template_mask_zone_3') {
      the_message = "Mask zone was successfully added"
    } else if (the_mode === 'flood_fill_1') {
      the_message = 'Select the area to flood fill'
    } else if (the_mode === 'arrow_fill_1') {
      the_message = 'Select the area to arrow fill'
    } else if (the_mode === 'add_template_mask_zone_1') {
      the_message = 'Select the first corner of the mask zone'
    } else if (the_mode === 'add_annotations_interactive') {
      the_message = 'press space to annotate/deannotate, left/right to advance through framesets'
    } else if (the_mode === 'add_annotations_ocr_start') {
      the_message = 'Select the first corner of the region the text area'
    }
    this.setState({
      mode: the_mode,
      insights_message: the_message,
    })
  }

  scrubberOnChange() {
    const framesets = this.props.getCurrentFramesets()
    const value = document.getElementById('movie_scrubber').value
    const keys = this.props.getFramesetHashesInOrder()
    const new_frameset_hash = keys[value]
    if (Object.keys(framesets).includes(new_frameset_hash) && 
        Object.keys(framesets[new_frameset_hash]).includes('images')) {
      const the_url = framesets[new_frameset_hash]['images'][0]
      this.displayInsightsMessage('.')
      this.setState({
        insights_image: the_url,
        insights_title: the_url,
      }, this.setImageSize)
    }
  }
  
  displayInsightsMessage(the_message) {
    this.setState({
      insights_message: the_message
    })
  }

  clearSelectedAreas() {
    const cur_hash = this.getScrubberFramesetHash() 
    this.props.setSelectedArea(
      [], 
      this.state.insights_image, 
      this.props.movie_url, cur_hash
    )
    this.setState({
      mode: 'view',
      insights_message: 'Selected Areas have been cleared',
    })
  }

  movieSplitDone(new_framesets) {
    const len = Object.keys(new_framesets).length
    document.getElementById('movie_scrubber').max = len-1
    const first_key = this.props.getFramesetHashesInOrder(new_framesets)[0]
    const first_image = new_framesets[first_key]['images'][0]
    this.setState({
      insights_image: first_image,
      insights_title: first_image,
      insights_message: 'Movie splitting completed.',
    }, this.setImageSize(first_image))
  }

  setCurrentVideo(video_url) {
    this.props.setActiveMovie(video_url, this.movieSplitDone)
  }

  handleImageClick = (e) => {
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    const scale = (document.getElementById('insights_image').width / 
        document.getElementById('insights_image').naturalWidth)
    const x_scaled = parseInt(x / scale)
    const y_scaled = parseInt(y / scale)
    if (x_scaled > this.state.image_width || y_scaled > this.state.image_height) {
        return
    }

    const scrubber_frameset_hash = this.getScrubberFramesetHash()
    const selected_areas = this.getSelectedAreas()
    if (this.state.mode === 'add_template_anchor_1') {
      this.doAddTemplateAnchorClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_template_anchor_2') {
      if (Object.keys(this.state.callbacks).includes('add_template_anchor_2')) {
        let callback = this.state.callbacks['add_template_anchor_2']
        callback(this.state.clicked_coords, [x_scaled, y_scaled])
      }
    } else if (this.state.mode === 'flood_fill_1') {
      this.setState({
        insights_image_scale: scale,
        clicked_coords: [x_scaled, y_scaled],
        insights_message: 'Calling flood fill api',
      })
      const sam_id = this.getSelectAreaMetaId('flood', x_scaled, y_scaled)
      this.props.doFloodFill(
        x_scaled, 
        y_scaled, 
        this.state.insights_image, 
        selected_areas, 
        scrubber_frameset_hash, 
        sam_id
      )
    } else if (this.state.mode === 'arrow_fill_1') {
      this.setState({
        insights_image_scale: scale,
        clicked_coords: [x_scaled, y_scaled],
        insights_message: 'Calling arrow fill api',
      })
      const sam_id = this.getSelectAreaMetaId('arrow', x_scaled, y_scaled)
      this.props.doArrowFill(
        x_scaled, 
        y_scaled, 
        this.state.insights_image, 
        selected_areas, 
        scrubber_frameset_hash, 
        sam_id, 
        this.afterArrowFill
      )
    } else if (this.state.mode === 'add_template_mask_zone_1') {
      this.doAddTemplateMaskZoneClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_template_mask_zone_2') {
      if (Object.keys(this.state.callbacks).includes('add_template_mask_zone_2')) {
        let callback = this.state.callbacks['add_template_mask_zone_2']
        callback(this.state.clicked_coords, [x_scaled, y_scaled])
      }
    } else if (this.state.mode === 'add_annotations_ocr_start') {
      this.doAddAnnotationsOcrStartClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_annotations_ocr_end') {
      this.doAddAnnotationsOcrStartClickOne(scale, x_scaled, y_scaled)
    }
  }

  afterArrowFill() {
    this.displayInsightsMessage('Fill area added, click to add another.')
  }

  doAddTemplateAnchorClickOne(scale, x_scaled, y_scaled) {
    this.setState({
      insights_image_scale: scale,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'pick the second corner of the anchor',
      mode: 'add_template_anchor_2',
    })
  }

  doAddTemplateMaskZoneClickOne(scale, x_scaled, y_scaled) {
    this.setState({
      insights_image_scale: scale,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'pick the second corner of the mask zone',
      mode: 'add_template_mask_zone_2',
    })
  }

  doAddAnnotationsOcrStartClickOne(scale, x_scaled, y_scaled) {
    this.setState({
      insights_image_scale: scale,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'pick the second corner of the text area',
      mode: 'add_annotations_ocr_end',
    })
  }

  getSelectAreaMetaId(fill_type='', offset_x=0, offset_y=0) {
    if (!this.props.current_selected_area_meta_id) {
      let deepCopySams = JSON.parse(JSON.stringify(this.props.selected_area_metas))
      let the_sam = this.createSelectedAreaMetaSkeleton(fill_type)
      // TODO Fill it in with values from the selected area controls 
      if (fill_type) {
        the_sam['fill_type'] = fill_type
      }
      if (this.state.selected_area_template_anchor) {
        the_sam['origin_template_id'] = this.props.current_template_id
        the_sam['origin_template_anchor_id'] = this.state.selected_area_template_anchor
      }
      if (offset_x || offset_y) {
        the_sam['offset'] = [offset_x, offset_y]
      }
      deepCopySams[the_sam['id']] = the_sam
      this.props.setSelectedAreaMetas(deepCopySams, the_sam['id'])
      return the_sam['id']
    } 
    return this.props.current_selected_area_meta_id
  }

  createSelectedAreaMetaSkeleton() {
    const sam_id = 'selected_area_meta_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let the_sam = {
      'id': sam_id,
      'name': sam_id,
      'offset': (0, 0),
      'box_size': 0,
      'origin_template_id': '',
      'origin_template_anchor_id': '',
      'fill_type': '',
      'tolerance': '',
      'mask_interior_exterior': '',
      'mask_method': '',
    }
    return the_sam
  }

  saveAnnotation(annotation_data, when_done=(()=>{})) {
    const cur_frameset_hash = this.getScrubberFramesetHash()
    let deepCopyAnnotations = JSON.parse(JSON.stringify(this.props.annotations))

    if (annotation_data['type'] && annotation_data['type'] === 'template') {
      let template_obj = {}
      if (Object.keys(deepCopyAnnotations).includes(annotation_data['template_id'])) {
        template_obj = deepCopyAnnotations[annotation_data['template_id']]
      }
      let movie_obj = {}
      if (Object.keys(template_obj).includes(this.props.movie_url)) {
        movie_obj = template_obj[this.props.movie_url]
      }
      let frameset_obj = {}
      if (Object.keys(movie_obj).includes(cur_frameset_hash)) {
        frameset_obj = movie_obj[cur_frameset_hash]
      }
      let anchor_obj = {}
      if (Object.keys(frameset_obj).includes(annotation_data['template_anchor_id'])) {
        anchor_obj = frameset_obj[annotation_data['template_anchor_id']]
      }
      anchor_obj['data'] = annotation_data['data']
      frameset_obj[annotation_data['template_anchor_id']] = anchor_obj
      movie_obj[cur_frameset_hash] = frameset_obj
      template_obj[this.props.movie_url] = movie_obj
      deepCopyAnnotations[annotation_data['template_id']] = template_obj
      this.props.setAnnotations(deepCopyAnnotations)
      when_done()
    }
    if (annotation_data['type'] && annotation_data['type'] === 'ocr') {
      let annotation_key = 'ocr:' + annotation_data['data']['match_string']

      let annotation_obj = {}
      if (Object.keys(deepCopyAnnotations).includes(annotation_key)) {
        annotation_obj = deepCopyAnnotations[annotation_key]
      } 
      let movie_obj = {}
      if (Object.keys(annotation_obj).includes(this.props.movie_url)) {
        movie_obj = annotation_obj[this.props.movie_url]
      }
      let new_data = {
        'match_percent': 90,
      }
      movie_obj[cur_frameset_hash] = new_data
      annotation_obj[this.props.movie_url] = movie_obj
      deepCopyAnnotations[annotation_key] = annotation_obj

      this.props.setAnnotations(deepCopyAnnotations)
      when_done()
    }

  }

  deleteAnnotation(scope='all') {
    if (scope === 'all') {
     this.props.setAnnotations({})
    }
  }

  setImageScale() {
    const scale = (document.getElementById('insights_image').width / 
        document.getElementById('insights_image').naturalWidth)
    this.setState({
      insights_image_scale: scale,
    })
  }

  setImageSize(the_image) {
    var app_this = this
    if (the_image) {
      let img = new Image()
      img.src = the_image
      img.onload = function() {
        app_this.setState({
          image_width: this.width,
          image_height: this.height,
        }, app_this.setImageScale()
        )
      }
    }
  }

  getScrubberFramesetHash() {
    const framesets = this.props.getCurrentFramesets()
    if (this.props.movie_url && 
        Object.keys(this.props.movies).includes(this.props.movie_url)) {
      for (let frameset_hash in framesets) {
        if (framesets[frameset_hash]['images'].includes(this.state.insights_image)) {
          return frameset_hash
        }
      }
    }

  }

  getTemplateMatches() {
    const template_matches = this.props.getCurrentTemplateMatches()
    if (!Object.keys(template_matches).includes(this.props.current_template_id)) {
      return
    }
    const cur_templates_matches = template_matches[this.props.current_template_id]
    if (!Object.keys(cur_templates_matches).includes(this.props.movie_url)) {
      return
    }
    const cur_movies_matches = cur_templates_matches[this.props.movie_url]
    // TODO this looks redundant, can we use getScrubberFramesetHash and eliminate this method?
    const insight_image_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)
    if (!Object.keys(cur_movies_matches).includes(insight_image_hash)) {
      return
    }
    return cur_movies_matches[insight_image_hash]
  }

  getSelectedAreas() {
    if (Object.keys(this.props.selected_areas).includes(this.props.movie_url)) {
      const movie_obj = this.props.selected_areas[this.props.movie_url]
      const frameset_hash = this.getScrubberFramesetHash() 
      if (Object.keys(movie_obj).includes(frameset_hash)) {
        const frameset_obj  = movie_obj[frameset_hash]
        if (Object.keys(frameset_obj).includes(this.state.insights_image)) {
          return frameset_obj[this.state.insights_image]
        }
      }
    }
    return []
  }

  getAnnotations() {
    if (!Object.keys(this.props.annotations).includes(this.props.current_template_id)) {
      return
    }
    const cur_templates_matches = this.props.annotations[this.props.current_template_id]
    if (!Object.keys(cur_templates_matches).includes(this.props.movie_url)) {
      return
    }
    const cur_movies_matches = cur_templates_matches[this.props.movie_url]
    const frameset_hash = this.getScrubberFramesetHash() 
    if (!Object.keys(cur_movies_matches).includes(frameset_hash)) {
      return
    }
    return cur_movies_matches[frameset_hash]
  }

  getScrubberHeight() {
    let bottom_y = 80
    if (this.state.insights_image) {
      bottom_y += document.getElementById('insights_image_div').offsetHeight
    }
    return bottom_y
  }

  render() {
    document.body.onkeydown = this.handleKeyDown
    let workbook_name = this.props.current_workbook_name
    if (!this.props.current_workbook_id) {
      workbook_name += ' (unsaved)'
    }
    let imageDivStyle= {
      width: this.props.image_width,
      height: this.props.image_height,
    }
    let bottom_y = this.getScrubberHeight()
    let the_display='block'
    if (!this.state.insights_image) {
      the_display='none'
    }
    const scrubber_style = {
      top: bottom_y,
      display: the_display,
    }
    return (
      <div id='insights_panel' className='row mt-5'>
        <div id='insights_left' className='col-lg-2'>
          <MovieCardList 
            setCurrentVideo={this.setCurrentVideo}
            movie_url={this.props.movie_url}
            movie_urls={this.props.campaign_movies}
            movies={this.props.movies}
            getMovieMatchesFound={this.getMovieMatchesFound}
            getMovieDiffsFound={this.getMovieDiffsFound}
            getMovieSelectedCount={this.getMovieSelectedCount}
            submitInsightsJob={this.submitInsightsJob}
            setMovieNickname={this.props.setMovieNickname}
            setDraggedId={this.setDraggedId}
          />
        </div>

        <div id='insights_middle' className='col-lg-7 ml-4'>
          <div 
              className='row'
              id='insights_header'
          >
            <div className='col'>
              <div className='row' id='insights_workbook'>
                <h4>{workbook_name}</h4>
              </div>
              <div className='row' id='insights_title'>
                {this.state.insights_title}
              </div>
              <div className='row' id='insights_message'>
                {this.state.insights_message}
              </div>
            </div>
          </div>
          <div 
              id='insights_image_div' 
              className='row'
              style={imageDivStyle}
          >
            <img 
                id='insights_image' 
                src={this.state.insights_image}
                alt={this.state.insights_image}
            />
            <CanvasInsightsOverlay 
              width={this.state.image_width}
              height={this.state.image_height}
              clickCallback={this.handleImageClick}
              currentImageIsTemplateAnchorImage={this.currentImageIsTemplateAnchorImage}
              getCurrentTemplateAnchors={this.props.getCurrentTemplateAnchors}
              getCurrentTemplateMaskZones={this.getCurrentTemplateMaskZones}
              insights_image_scale={this.state.insights_image_scale}
              getTemplateMatches={this.getTemplateMatches}
              getSelectedAreas={this.getSelectedAreas}
              getAnnotations={this.getAnnotations}
              mode={this.state.mode}
              clicked_coords={this.state.clicked_coords}
            />
          </div>
          <div 
              id='insights_scrubber_div' 
              className='row'
              style={scrubber_style}
          >
            <input 
                id='movie_scrubber' 
                type='range' 
                defaultValue='0'
                onChange={this.scrubberOnChange}
            />
          </div>
          <BottomInsightsControls 
            handleSetMode={this.handleSetMode}
            getCurrentTemplateMatches={this.props.getCurrentTemplateMatches}
            clearSelectedAreas={this.clearSelectedAreas}
            clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
            insights_image={this.state.insights_image}
            movie_url={this.props.movie_url}
            callPing={this.callPing}
            templates={this.props.templates}
            current_template_id={this.props.current_template_id}
            setTemplates={this.props.setTemplates}
            setCurrentTemplateId={this.props.setCurrentTemplateId}
            submitInsightsJob={this.submitInsightsJob}
            saveWorkbook={this.props.saveWorkbook}
            saveWorkbookName={this.props.saveWorkbookName}
            setSelectedAreaTemplateAnchor={this.setSelectedAreaTemplateAnchor}
            getCurrentSelectedAreaMeta={this.getCurrentSelectedAreaMeta}
            current_workbook_name={this.props.current_workbook_name}
            current_workbook_id={this.props.current_workbook_id}
            workbooks={this.props.workbooks}
            loadWorkbook={this.props.loadWorkbook}
            deleteWorkbook={this.props.deleteWorkbook}
            displayInsightsMessage={this.displayInsightsMessage}
            saveAnnotation={this.saveAnnotation}
            deleteAnnotation={this.deleteAnnotation}
            annotations={this.props.annotations}
            setKeyDownCallback={this.setKeyDownCallback}
            getAnnotations={this.getAnnotations}
            cropImage={this.props.cropImage}
            movie_sets={this.props.movie_sets}
            setMovieSets={this.props.setMovieSets}
            draggedId={this.state.draggedId}
            visibilityFlags={this.state.visibilityFlags}
            toggleShowVisibility={this.toggleShowVisibility}
            playSound={this.props.playSound}
            togglePlaySound={this.props.togglePlaySound}
            setFramesetDiscriminator={this.props.setFramesetDiscriminator}
            campaign_movies={this.props.campaign_movies}
            setCampaignMovies={this.props.setCampaignMovies}
            updateGlobalState={this.props.updateGlobalState}
            blinkDiff={this.blinkDiff}
            setImageTypeToDisplay={this.setImageTypeToDisplay}
            imageTypeToDisplay={this.state.imageTypeToDisplay}
            whenDoneTarget={this.props.whenDoneTarget}
            setWhenDoneTarget={this.props.setWhenDoneTarget}
            files={this.props.files}
            getFiles={this.props.getFiles}
            deleteFile={this.props.deleteFile}
            frameset_discriminator={this.props.frameset_discriminator}
            preserveAllJobs={this.props.preserveAllJobs}
            togglePreserveAllJobs={this.props.togglePreserveAllJobs}
            telemetry_rules={this.props.telemetry_rules}
            current_telemetry_rule_id={this.props.current_telemetry_rule_id}
            telemetry_data={this.props.telemetry_data}
            setTelemetryData={this.props.setTelemetryData}
            setTelemetryRules={this.props.setTelemetryRules}
            setCurrentTelemetryRuleId={this.props.setCurrentTelemetryRuleId}
            addInsightsCallback={this.addInsightsCallback}
          />
        </div>

        <div id='insights_right' className='col-lg-2 ml-4'>
          <JobCardList 
            jobs={this.props.jobs}
            getJobs={this.props.getJobs}
            loadInsightsJobResults={this.loadInsightsJobResults}
            cancelJob={this.props.cancelJob}
            workbooks={this.props.workbooks}
          />
        </div>
      </div>
    );
  }
}

export default InsightsPanel;
