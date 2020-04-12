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
      modal_data: '',
    }
    this.getAnnotations=this.getAnnotations.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.getTier1ScannerMatches=this.getTier1ScannerMatches.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.currentImageIsSelectedAreaAnchorImage=this.currentImageIsSelectedAreaAnchorImage.bind(this)
    this.currentImageIsOcrAnchorImage=this.currentImageIsOcrAnchorImage.bind(this)
    this.afterPingSuccess=this.afterPingSuccess.bind(this)
    this.afterPingFailure=this.afterPingFailure.bind(this)
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
    this.setModalData=this.setModalData.bind(this)
    this.getCurrentOcrMatches=this.getCurrentOcrMatches.bind(this)
    this.getCurrentAreasToRedact=this.getCurrentAreasToRedact.bind(this)
    this.setScrubberToIndex=this.setScrubberToIndex.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
    this.getCurrentSelectedAreaCenters=this.getCurrentSelectedAreaCenters.bind(this)
    this.getCurrentSelectedAreaMinimumZones=this.getCurrentSelectedAreaMinimumZones.bind(this)
    this.getCurrentSelectedAreaOriginLocation=this.getCurrentSelectedAreaOriginLocation.bind(this)
    this.getCurrentOcrOriginLocation=this.getCurrentOcrOriginLocation.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.getCurrentOcrWindow=this.getCurrentOcrWindow.bind(this)
  }

  currentImageIsOcrAnchorImage() {
    if (this.props.current_ocr_rule_id) {
      let key = this.props.current_ocr_rule_id
      if (!Object.keys(this.props.ocr_rules).includes(key)) {
        return false
      }
      let ocr_rule = this.props.ocr_rules[key]
      if (!Object.keys(ocr_rule).includes('image')) {
        return false
      }
      let cur_ocr_rule_anchor_image_name = ocr_rule['image']
      return (cur_ocr_rule_anchor_image_name === this.state.insights_image)
    } else {
      return true
    }
  }

  setScrubberToIndex(the_value) {
    document.getElementById('movie_scrubber').value = the_value
    this.scrubberOnChange()
  }

  getCurrentOcrWindow() {
    if (Object.keys(this.state.callbacks).includes('getOcrWindow')) {
      return this.state.callbacks['getOcrWindow']()
    }
    return []
  }

  getCurrentSelectedAreaCenters() {
    if (Object.keys(this.state.callbacks).includes('getCurrentSelectedAreaCenters')) {
      return this.state.callbacks['getCurrentSelectedAreaCenters']()
    }
    return []
  }

  getCurrentSelectedAreaMinimumZones() {
    if (Object.keys(this.state.callbacks).includes('getCurrentSelectedAreaMinimumZones')) {
      return this.state.callbacks['getCurrentSelectedAreaMinimumZones']()
    }
    return []
  }

  getCurrentSelectedAreaOriginLocation() {
    if (Object.keys(this.state.callbacks).includes('getCurrentSelectedAreaOriginLocation')) {
      return this.state.callbacks['getCurrentSelectedAreaOriginLocation']()
    }
    return []
  }

  getCurrentOcrOriginLocation() {
    if (Object.keys(this.state.callbacks).includes('getCurrentOcrOriginLocation')) {
      return this.state.callbacks['getCurrentOcrOriginLocation']()
    }
    return []
  }

  getCurrentTemplateAnchors() {
    if (Object.keys(this.state.callbacks).includes('getCurrentTemplateAnchors')) {
      return this.state.callbacks['getCurrentTemplateAnchors']()
    }
    return []
  }

  getCurrentTemplateMaskZones() {
    if (Object.keys(this.state.callbacks).includes('getCurrentTemplateMaskZones')) {
      return this.state.callbacks['getCurrentTemplateMaskZones']()
    }
    return []
  }

  getCurrentAreasToRedact() {
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)
    if (!frameset_hash) {
      return []
    }
    if (!this.props.movies || !this.props.movie_url) {
      return []
    }
    const this_frameset = this.props.movies[this.props.movie_url]['framesets'][frameset_hash]
    if (Object.keys(this_frameset).includes('areas_to_redact')) {
      return this_frameset['areas_to_redact']
    }
    return []
  }

  getCurrentOcrMatches() {
    if (Object.keys(this.props.tier_1_matches['ocr']).includes(this.props.current_ocr_rule_id)) {
      const this_ocr_rule_matches = this.props.tier_1_matches['ocr'][this.props.current_ocr_rule_id]  
      if (Object.keys(this_ocr_rule_matches['movies']).includes(this.props.movie_url)) {
        const this_movies_matches = this_ocr_rule_matches['movies'][this.props.movie_url]
        const frameset_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)
        if (Object.keys(this_movies_matches['framesets']).includes(frameset_hash)) {
          const this_framesets_matches = this_movies_matches['framesets'][frameset_hash]
          if (Object.keys(this_framesets_matches).length) {
            let return_arr = []
            for (let i=0; i < Object.keys(this_framesets_matches).length; i++) {
              const ocr_hit_key = Object.keys(this_framesets_matches)[i]
              const ocr_hit_record = this_framesets_matches[ocr_hit_key]
              return_arr.push(ocr_hit_record)
            }
            return return_arr
          }
        }
      }
    }
    return []
  }

  setModalData(the_data) {
    this.setState({
      modal_data: the_data,
    })
  }

  addInsightsCallback(the_key, the_callback) {
    let new_callbacks = this.state.callbacks
    new_callbacks[the_key] = the_callback
    this.setState({
      callbacks: new_callbacks,
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
    if ((job.app === 'parse' && job.operation === 'split_and_hash_threaded')) {
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
    this.scrubberOnChange()
    if (Object.keys(this.props.getCurrentFramesets()).length > 0) {
      this.movieSplitDone(this.props.getCurrentFramesets())
    }
    this.props.getJobs()
    this.props.getWorkbooks()
    this.props.getPipelines()
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

  makeSourceForPassedT1Output(tier_1_output) {
    let movies_obj = {}
    for (let i=0; i < Object.keys(tier_1_output).length; i++) {
      const movie_url = Object.keys(tier_1_output)[i]
      movies_obj[movie_url] = this.props.movies[movie_url]
    }
    return movies_obj
  }

  buildTier1JobData(scanner_type, scope, extra_data) {
    let job_data = {
      request_data: {},
    }
    if (scanner_type === 'template') {
      if (!this.props.current_template_id) {
        this.displayInsightsMessage('no template selected, cannot submit a job')
        return
      }
      const template = this.props.templates[this.props.current_template_id]
      job_data['request_data']['templates'] = {}
      job_data['request_data']['templates'][template['id']] = template
      job_data['app'] = 'analyze'
      job_data['operation'] = 'scan_template_threaded'
      job_data['request_data']['scan_level'] = template['scan_level']
      job_data['request_data']['id'] = template['id']
      job_data['description'] = 'scan template (' + template['name'] + ') '
    } else if (scanner_type === 'ocr') {
      if (!this.props.current_ocr_rule_id) {
        this.displayInsightsMessage('no ocr rule selected, cannot submit a job')
        return
      }
      const ocr_rule = this.props.ocr_rules[this.props.current_ocr_rule_id]
      job_data['request_data']['movies'] = {}
      job_data['request_data']['ocr_rules'] = {}
      job_data['request_data']['ocr_rules'][ocr_rule['id']] = ocr_rule
      job_data['app'] = 'analyze'
      job_data['operation'] = 'scan_ocr'
      job_data['request_data']['scan_level'] = ocr_rule['scan_level']
      job_data['request_data']['id'] = ocr_rule['id']
      job_data['description'] = 'scan ocr (rule ' + ocr_rule['name'] + ') '
    } else if (scanner_type === 'selected_area') {
      if (!this.props.current_selected_area_meta_id) {
        this.displayInsightsMessage('no selected_area_meta selected, cannot submit a job')
        return
      }
      job_data['app'] = 'analyze'
      job_data['operation'] = 'selected_area_threaded'
      const cur_selected_area = this.props.selected_area_metas[this.props.current_selected_area_meta_id]
      job_data['request_data']['selected_area_metas'] = {}
      job_data['request_data']['selected_area_metas'][this.props.current_selected_area_meta_id] = cur_selected_area
      job_data['request_data']['id'] = this.props.current_selected_area_meta_id
      job_data['request_data']['scan_level'] = cur_selected_area['scan_level']
      job_data['description'] = 'scan selected area (' + cur_selected_area['name'] + ') '
    }
    job_data['request_data']['movies'] = {}
    if (scope.match(/_current_frame$/)) {   
      job_data['description'] += 'for frame '
      job_data['request_data']['movies'] = this.buildOneFrameMovieForCurrentInsightsImage()
    } else if (scope.match(/_current_movie$/)) {   
      job_data['description'] += 'for movie: ' + this.props.movie_url
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    } else if (scope.match(/_all_movies$/)) {   
      job_data['description'] += 'for all movies'
      job_data['request_data']['movies'] = this.props.movies
    } else if (scope.match(/_t1_template$/)) {   
      const template_id = extra_data
      const t1_template = this.props.templates[template_id]
      const tier_1_output = this.props.tier_1_matches['template'][template_id]['movies']
      job_data['description'] += 'on t1 template results (template ' + t1_template['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_selected_area$/)) {   
      const selected_area_id = extra_data
      const t1_selected_area_meta = this.props.selected_area_metas[selected_area_id]
      const tier_1_output = this.props.tier_1_matches['selected_area'][selected_area_id]['movies']
      job_data['description'] += 'on t1 selected area results (sa ' + t1_selected_area_meta['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_ocr$/)) {   
      const ocr_id = extra_data
      const t1_ocr_rule = this.props.ocr_rules[ocr_id]
      const tier_1_output = this.props.tier_1_matches['ocr'][ocr_id]['movies']
      job_data['description'] += 'on t1 ocr results (ocr ' + t1_ocr_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_telemetry$/)) {   
      const telemetry_id = extra_data
      const telemetry_rule = this.props.telemetry_rules[telemetry_id]
      const tier_1_output = this.props.tier_1_matches['telemetry'][telemetry_id]['movies']
      job_data['description'] += 'on t1 telemetry results (telemetry ' + telemetry_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    }
    return job_data
  }

  buildOneFrameMovieForCurrentInsightsImage() {
    const cur_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)
    let movies_wrap = {}
    movies_wrap[this.props.movie_url] = {}
    movies_wrap[this.props.movie_url]['framesets'] = {}
    movies_wrap[this.props.movie_url]['framesets'][cur_hash] = (
       this.props.movies[this.props.movie_url]['framesets'][cur_hash]
    )
    movies_wrap[this.props.movie_url]['frames'] = [this.state.insights_image]
    return movies_wrap
  }

  getCountsFromMovieBuildObj(movie_build_obj) {
    let counts = {}
    counts['movie'] = 0
    counts['frameset'] = 0
    for (let i=0; i < Object.keys(movie_build_obj).length; i++) {
      counts['movie'] += 1
      const movie_url = Object.keys(movie_build_obj)[i]
      const movie = movie_build_obj[movie_url]
      for (let j=0; j < Object.keys(movie['framesets']).length; j++) {
        counts['frameset'] += 1
      }
    }
    return counts
  }

  buildSplitAndHashJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_threaded'
    if (Array.isArray(extra_data)) {
      job_data['description'] = 'split and hash threaded - all campaign movies'
    } else {
      job_data['description'] = 'split and hash threaded: ' + extra_data
    }
    if (Array.isArray(extra_data)) {
      job_data['request_data']['movie_urls'] = extra_data
    } else {
      job_data['request_data']['movie_urls'] = [extra_data]
    }
    job_data['request_data']['preserve_movie_audio'] = this.props.preserve_movie_audio
    job_data['request_data']['frameset_discriminator'] = this.props.frameset_discriminator
    return job_data
  }

  buildRebaseMoviesJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'rebase_movies'
    job_data['description'] = 'rebase movies'
    job_data['request_data']['movies'] = this.props.movies
    return job_data
  }

  buildRebaseJobsJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'jobs'
    job_data['operation'] = 'rebase_jobs'
    job_data['description'] = 'rebase_jobs'
    job_data['request_data']['movie_urls'] = Object.keys(this.props.movies)
    let job_ids = []
    for (let i=0; i < this.props.jobs.length; i++) {
      job_ids.push(this.props.jobs[i]['id'])
    }
    job_data['request_data']['job_ids'] = job_ids
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

  buildResultsData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    if (extra_data['type'] === 'template_match_chart') {
      job_data['operation'] = 'template_match_chart'
      job_data['request_data']['job_ids'] = [extra_data['job_id']]
    } else if (extra_data['type'] === 'ocr_match_chart') {
      job_data['operation'] = 'ocr_match_chart'
      job_data['request_data']['job_ids'] = [extra_data['job_id']]
    }
    job_data['description'] = 'chart results for job ' + extra_data['job_id']
    return job_data
  }

  buildGetTimestampJobData(scope, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'get_timestamp_threaded'
    if (scope === 'current_movie') {
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['description'] = 'get timestamp for movie: ' + this.props.movie_url
    } else if (scope === 'all_movies') {
      job_data['request_data']['movies'] = this.props.movies
      job_data['description'] = 'get timestamp for all movies'
    }
    return job_data
  }

  buildSaveMovieMetadataJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    const movie_url = Object.keys(extra_data['movies'])[0]
    job_data['app'] = 'files'
    job_data['operation'] = 'save_movie_metadata'
    job_data['description'] = 'save_movie_metadata: ' + movie_url
    job_data['request_data'] = extra_data
    return job_data
  }

  buildLoadMovieMetadataJobData(extra_data) {
    let job_data = {
      request_data: extra_data,
    }
    job_data['app'] = 'files'
    job_data['operation'] = 'load_movie_metadata'
    job_data['description'] = 'load_movie_metadata: ' + extra_data
    return job_data
  }

  buildScanTelemetryData(job_type, extra_data) {
    let job_data = {
      request_data: {},
    }
    const telemetry_rule = this.props.telemetry_rules[this.props.current_telemetry_rule_id]
    job_data['app'] = 'analyze'
    job_data['operation'] = 'telemetry_find_matching_frames'
    job_data['request_data']['telemetry_data'] = this.props.telemetry_data
    job_data['request_data']['telemetry_rule'] = telemetry_rule
    job_data['request_data']['id'] = this.props.current_telemetry_rule_id
    job_data['request_data']['scan_level'] = 'tier_1' // this is the only thing that makes sense for telemetry
    if (job_type === 'current_movie') {
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['description'] = 'telemetry, find matching frames for movie'
      job_data['description'] += ': movie ' + this.props.movie_url
      job_data['description'] += ', rule ' + telemetry_rule['name']
    } else if (job_type === 'all_movies') {
      job_data['request_data']['movies'] = this.props.movies
      job_data['description'] = 'telemetry, find matching frames for all movies'
      job_data['description'] += ': rule ' + telemetry_rule['name']
    }
    return job_data
  }

  buildGetSecureFileData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'files'
    job_data['operation'] = 'get_secure_file'
    job_data['description'] = 'get secure file: ' + extra_data
    job_data['request_data']['recording_id'] = extra_data
    return job_data
  }

  getType1ScannerType(tier_1_scanner_id) {
    for (let i=0; i < Object.keys(this.props.tier_1_matches).length; i++) {
      const scanner_type = Object.keys(this.props.tier_1_matches)[i]
      for (let j=0; j < Object.keys(this.props.tier_1_matches[scanner_type]).length; j++) {
        const scanner_id = Object.keys(this.props.tier_1_matches[scanner_type])[j]
        if (tier_1_scanner_id === scanner_id) {
          return scanner_type
        }
      }
    }
  }

  submitInsightsJob(job_string, extra_data) {
    if (job_string === 'get_secure_file') {
      let job_data = this.buildGetSecureFileData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'load_movie_metadata') {
      let job_data = this.buildLoadMovieMetadataJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'results') {
      let job_data = this.buildResultsData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    }
    if (!this.props.movie_url) {
      this.displayInsightsMessage('no movie loaded, cannot submit a job')
      return
    }
    if (
        job_string === 'ocr_current_frame' || 
        job_string === 'ocr_t1_template' || 
        job_string === 'ocr_t1_selected_area' || 
        job_string === 'ocr_t1_ocr' || 
        job_string === 'ocr_t1_telemetry' || 
        job_string === 'ocr_current_movie' || 
        job_string === 'ocr_all_movies'
    ) {
      let job_data = this.buildTier1JobData('ocr', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'template_current_frame' || 
        job_string === 'template_t1_template' || 
        job_string === 'template_t1_selected_area' || 
        job_string === 'template_t1_ocr' || 
        job_string === 'template_t1_telemetry' || 
        job_string === 'template_current_movie' || 
        job_string === 'template_all_movies'
    ) {
      let job_data = this.buildTier1JobData('template', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'selected_area_t1_template' || 
        job_string === 'selected_area_t1_ocr' || 
        job_string === 'selected_area_current_frame' || 
        job_string === 'selected_area_current_movie' || 
        job_string === 'selected_area_all_movies' || 
        job_string === 'selected_area_t1_selected_area' || 
        job_string === 'selected_area_movie_set'
    ) {
      let job_data = this.buildTier1JobData('selected_area', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'split_and_hash_threaded') {
      let job_data = this.buildSplitAndHashJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'rebase_movies') {
      let job_data = this.buildRebaseMoviesJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'rebase_jobs') {
      let job_data = this.buildRebaseJobsJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'get_timestamp_current_movie') {
      let job_data = this.buildGetTimestampJobData('current_movie', extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'get_timestamp_all_movies') {
      let job_data = this.buildGetTimestampJobData('all_movies', extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'save_movie_url') {
      let job_data = this.buildSaveMovieUrlJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'save_movie_metadata') {
      let job_data = this.buildSaveMovieMetadataJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (job_string === 'diffs_current_movie') {
      let job_data = this.buildCalcDiffsData('current_movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'telemetry_current_movie') {
      let job_data = this.buildScanTelemetryData('current_movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'telemetry_all_movies') {
      let job_data = this.buildScanTelemetryData('all_movies', extra_data)
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
    } else {
      return true
    }
  }

  currentImageIsSelectedAreaAnchorImage() {
    if (this.props.current_selected_area_meta_id) {
      let key = this.props.current_selected_area_meta_id
      if (!Object.keys(this.props.selected_area_metas).includes(key)) {
        return false
      }
      let sam = this.props.selected_area_metas[key]
      if (!Object.keys(sam).includes('areas')) {
        return false
      }
      if (!sam['areas'].length) {
        return false
      }
      let cur_sam_anchor_image_name = sam['areas'][0]['image']
      return (cur_sam_anchor_image_name === this.state.insights_image)
    } else {
      return true
    }
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
    let the_message = '.'
    if (the_mode === 'add_template_anchor_1') {
      the_message = 'Select the first corner of the Region of Interest'
    } else if (the_mode === 'add_template_anchor_3') {
      the_message = "Anchor was successfully added"
    } else if (the_mode === 'add_template_mask_zone_3') {
      the_message = "Mask zone was successfully added"
    } else if (the_mode === 'add_template_mask_zone_1') {
      the_message = 'Select the first corner of the mask zone'
    } else if (the_mode === 'add_annotations_interactive') {
      the_message = 'press space to annotate/deannotate, left/right to advance through framesets'
    } else if (the_mode === 'add_annotations_ocr_start') {
      the_message = 'Select the first corner of the region the text area'
    } else if (the_mode === 'add_sa_origin_location_1') {
      the_message = 'Select the origin location'
    } else if (the_mode === 'add_ocr_origin_location_1') {
      the_message = 'Select the origin location'
    } else if (the_mode === 'selected_area_minimum_zones_1') {
      the_message = 'Select the upper left corner of the zone'
    } else if (the_mode === 'selected_area_minimum_zones_2') {
      the_message = 'Select the bottom right corner of the zone'
    } else if (the_mode === 'add_template_anchor_2') {
      the_message = 'pick the second corner of the anchor'
    } else if (the_mode === 'add_template_mask_zone_2') {
      the_message = 'pick the second corner of the mask zone'
    } else if (the_mode === 'add_annotations_ocr_end') {
      the_message = 'pick the second corner of the text area'
    } else if (the_mode === 'scan_ocr_2') {
      the_message = 'click second corner'
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
      }, this.setImageSize(the_url))
    }
  }
  
  displayInsightsMessage(the_message) {
    this.setState({
      insights_message: the_message
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

  setCurrentVideo(video_url, when_done=(()=>{})) {
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
    this.setState({
      clicked_coords: [x_scaled, y_scaled],
      insights_image_scale: scale,
    })
    if (this.state.mode === 'add_template_anchor_1') {
      this.handleSetMode('add_template_anchor_2') 
    } else if (Object.keys(this.state.callbacks).includes(this.state.mode)) {
      this.state.callbacks[this.state.mode]([x_scaled, y_scaled])
    } else if (this.state.mode === 'add_template_mask_zone_1') {
      this.handleSetMode('add_template_mask_zone_2') 
    } else if (this.state.mode === 'scan_ocr_1') {
      this.handleSetMode('scan_ocr_2') 
    } else if (this.state.mode === 'add_annotations_ocr_start') {
      this.handleSetMode('add_annotations_ocr_end') 
    } else if (this.state.mode === 'add_annotations_ocr_end') {
      this.handleSetMode('add_annotations_ocr_end') 
    }
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
      this.props.setGlobalStateVar('annotations', deepCopyAnnotations)
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

      this.props.setGlobalStateVar('annotations', deepCopyAnnotations)
      when_done()
    }

  }

  deleteAnnotation(scope='all') {
    if (scope === 'all') {
     this.props.setGlobalStateVar('annotations', {})
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

  getTier1ScannerMatches(scanner_type) {
    let current_scanner_id = ''
    if (scanner_type === 'template') {
      current_scanner_id = this.props.current_template_id
    } else if (scanner_type === 'ocr') {
      current_scanner_id = this.props.current_ocr_rule_id
    } else if (scanner_type === 'selected_area') {
      current_scanner_id = this.props.current_selected_area_meta_id
    }
    const scanner_matches = this.props.tier_1_matches[scanner_type]
    if (!Object.keys(scanner_matches).includes(current_scanner_id)) {
      return
    }
    const cur_scanners_matches = scanner_matches[current_scanner_id]
    if (!Object.keys(cur_scanners_matches).includes('movies') || 
        !Object.keys(cur_scanners_matches['movies']).includes(this.props.movie_url)) {
      return
    }
    const cur_movies_matches = cur_scanners_matches['movies'][this.props.movie_url]
    // TODO this looks redundant, can we use getScrubberFramesetHash and eliminate this method?
    const insight_image_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)
    if (!Object.keys(cur_movies_matches['framesets']).includes(insight_image_hash)) {
      return
    }
    return cur_movies_matches['framesets'][insight_image_hash]
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

  buildInsightsModal() {
    if (this.state.modal_data) {
      return (
        <div className="modal" id='insightsPanelModal' tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl" id='insightsPanelModalInner' role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Viewing Job Data</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <pre>
                {this.state.modal_data}
                </pre>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return ''
  }

  render() {
    const insights_modal = this.buildInsightsModal()

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

        {insights_modal}

        <div id='insights_left' className='col-lg-2'>
          <MovieCardList 
            setCurrentVideo={this.setCurrentVideo}
            movie_url={this.props.movie_url}
            campaign_movies={this.props.campaign_movies}
            movies={this.props.movies}
            submitInsightsJob={this.submitInsightsJob}
            setMovieNickname={this.props.setMovieNickname}
            setDraggedId={this.setDraggedId}
            tier_1_matches={this.props.tier_1_matches}
            current_template_id={this.props.current_template_id}
            current_telemetry_rule_id={this.props.current_telemetry_rule_id}
            current_ocr_rule_id={this.props.current_ocr_rule_id}
            current_selected_area_meta_id={this.props.current_selected_area_meta_id}
            getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
            getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
            setScrubberToIndex={this.setScrubberToIndex}
            insights_image={this.state.insights_image}
            setGlobalStateVar={this.props.setGlobalStateVar}
            displayInsightsMessage={this.displayInsightsMessage}
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
              currentImageIsSelectedAreaAnchorImage={this.currentImageIsSelectedAreaAnchorImage}
              currentImageIsOcrAnchorImage={this.currentImageIsOcrAnchorImage}
              insights_image_scale={this.state.insights_image_scale}
              getTier1ScannerMatches={this.getTier1ScannerMatches}
              getAnnotations={this.getAnnotations}
              mode={this.state.mode}
              clicked_coords={this.state.clicked_coords}
              getCurrentOcrMatches={this.getCurrentOcrMatches}
              getCurrentAreasToRedact={this.getCurrentAreasToRedact}
              movie_url={this.props.movie_url}
              getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
              getCurrentTemplateMaskZones={this.getCurrentTemplateMaskZones}
              getCurrentOcrWindow={this.getCurrentOcrWindow}
              getCurrentSelectedAreaCenters={this.getCurrentSelectedAreaCenters}
              getCurrentSelectedAreaMinimumZones={this.getCurrentSelectedAreaMinimumZones}
              getCurrentSelectedAreaOriginLocation={this.getCurrentSelectedAreaOriginLocation}
              getCurrentOcrOriginLocation={this.getCurrentOcrOriginLocation}
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
            setGlobalStateVar={this.props.setGlobalStateVar}
            toggleGlobalStateVar={this.props.toggleGlobalStateVar}
            handleSetMode={this.handleSetMode}
            tier_1_matches={this.props.tier_1_matches}
            insights_image={this.state.insights_image}
            movie_url={this.props.movie_url}
            callPing={this.callPing}
            templates={this.props.templates}
            current_template_id={this.props.current_template_id}
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
            draggedId={this.state.draggedId}
            visibilityFlags={this.state.visibilityFlags}
            toggleShowVisibility={this.toggleShowVisibility}
            playSound={this.props.playSound}
            campaign_movies={this.props.campaign_movies}
            setCampaignMovies={this.props.setCampaignMovies}
            updateGlobalState={this.props.updateGlobalState}
            blinkDiff={this.blinkDiff}
            setImageTypeToDisplay={this.setImageTypeToDisplay}
            imageTypeToDisplay={this.state.imageTypeToDisplay}
            whenDoneTarget={this.props.whenDoneTarget}
            files={this.props.files}
            getFiles={this.props.getFiles}
            deleteFile={this.props.deleteFile}
            frameset_discriminator={this.props.frameset_discriminator}
            preserveAllJobs={this.props.preserveAllJobs}
            telemetry_rules={this.props.telemetry_rules}
            current_telemetry_rule_id={this.props.current_telemetry_rule_id}
            telemetry_data={this.props.telemetry_data}
            setTelemetryData={this.props.setTelemetryData}
            setTelemetryRules={this.props.setTelemetryRules}
            addInsightsCallback={this.addInsightsCallback}
            clicked_coords={this.state.clicked_coords}
            userTone={this.props.userTone}
            setScrubberToIndex={this.setScrubberToIndex}
            getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
            getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
            movies={this.props.movies}
            setCurrentVideo={this.setCurrentVideo}
            saveScannerToDatabase={this.props.saveScannerToDatabase}
            scanners={this.props.scanners}
            getScanners={this.props.getScanners}
            deleteScanner={this.props.deleteScanner}
            importScanner={this.props.importScanner}
            current_ocr_rule_id={this.props.current_ocr_rule_id}
            preserve_movie_audio={this.props.preserve_movie_audio}
            selected_area_metas={this.props.selected_area_metas}
            current_selected_area_meta_id={this.props.current_selected_area_meta_id}
            setSelectedAreaMetas={this.props.setSelectedAreaMetas}
            ocr_rules={this.props.ocr_rules}
            pipelines={this.props.pipelines}
            current_pipeline_id={this.props.current_pipeline_id}
            getPipelines={this.props.getPipelines}
            dispatchPipeline={this.props.dispatchPipeline}
            deletePipeline={this.props.deletePipeline}
            savePipelineToDatabase={this.props.savePipelineToDatabase}
            jobs={this.props.jobs}
            results={this.props.results}
          />
        </div>

        <div id='insights_right' className='col-lg-2 ml-4'>
          <JobCardList 
            jobs={this.props.jobs}
            getJobs={this.props.getJobs}
            loadInsightsJobResults={this.loadInsightsJobResults}
            cancelJob={this.props.cancelJob}
            workbooks={this.props.workbooks}
            getJobResultData={this.props.getJobResultData}
            setModalData={this.setModalData}
            wrapUpJob={this.props.wrapUpJob}
          />
        </div>
      </div>
    )
  }
}

export default InsightsPanel;
