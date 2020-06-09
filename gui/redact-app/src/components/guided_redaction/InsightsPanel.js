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
      insights_message: '.',
      prev_coords: (0,0),
      clicked_coords: (0,0),
      selected_area_template_anchor: '',
      draggedId: null,
      imageTypeToDisplay: '',
      callbacks: {},
      modal_data: '',
      modal_image: '',
    }
    this.getAnnotations=this.getAnnotations.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.setInsightsImage=this.setInsightsImage.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.getTier1ScannerMatches=this.getTier1ScannerMatches.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.currentImageIsHogTrainingImage=this.currentImageIsHogTrainingImage.bind(this)
    this.currentImageIsHogTestingImage=this.currentImageIsHogTestingImage.bind(this)
    this.currentImageIsSelectedAreaAnchorImage=this.currentImageIsSelectedAreaAnchorImage.bind(this)
    this.currentImageIsOcrAnchorImage=this.currentImageIsOcrAnchorImage.bind(this)
    this.currentImageIsOsaMatchImage=this.currentImageIsOsaMatchImage.bind(this)
    this.afterPingSuccess=this.afterPingSuccess.bind(this)
    this.afterPingFailure=this.afterPingFailure.bind(this)
    this.afterGetVersionSuccess=this.afterGetVersionSuccess.bind(this)
    this.afterGetVersionFailure=this.afterGetVersionFailure.bind(this)
    this.callPing=this.callPing.bind(this)
    this.callGetVersion=this.callGetVersion.bind(this)
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
    this.loadInsightsJobResults=this.loadInsightsJobResults.bind(this)
    this.afterMovieSplitInsightsJobLoaded=this.afterMovieSplitInsightsJobLoaded.bind(this)
    this.blinkDiff=this.blinkDiff.bind(this)
    this.setImageTypeToDisplay=this.setImageTypeToDisplay.bind(this)
    this.addInsightsCallback=this.addInsightsCallback.bind(this)
    this.setModalData=this.setModalData.bind(this)
    this.setModalImage=this.setModalImage.bind(this)
    this.getCurrentOcrMatches=this.getCurrentOcrMatches.bind(this)
    this.getCurrentAreasToRedact=this.getCurrentAreasToRedact.bind(this)
    this.setScrubberToIndex=this.setScrubberToIndex.bind(this)
    this.getCurrentOcrSceneAnalysisMatches=this.getCurrentOcrSceneAnalysisMatches.bind(this)
    this.runCallbackFunction=this.runCallbackFunction.bind(this)
  }

  getCurrentOcrSceneAnalysisMatches() {
    const osa_key = this.props.tier_1_scanner_current_ids['ocr_scene_analysis']
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)

    const data = this.props.tier_1_matches['ocr_scene_analysis'][osa_key]['movies'][this.props.movie_url]['framesets'][frameset_hash]
    return data
  }

  currentImageIsOcrAnchorImage() {
    if (this.props.tier_1_scanner_current_ids['ocr']) {
      let key = this.props.tier_1_scanner_current_ids['ocr']
      if (!Object.keys(this.props.tier_1_scanners['ocr']).includes(key)) {
        return false
      }
      let ocr_rule = this.props.tier_1_scanners['ocr'][key]
      if (!Object.keys(ocr_rule).includes('image')) {
        return false
      }
      let cur_ocr_rule_anchor_image_name = ocr_rule['image']
      return (cur_ocr_rule_anchor_image_name === this.state.insights_image)
    } else {
      return true // TODO I think this should be false, test it later
    }
  }

  currentImageIsOsaMatchImage() {
    if (!this.state.insights_image) {
      return
    }
    if (!this.props.tier_1_matches['ocr_scene_analysis']) {
      return
    }
    if (this.props.tier_1_scanner_current_ids['ocr_scene_analysis']) {
      let osa_key = this.props.tier_1_scanner_current_ids['ocr_scene_analysis']
      if (!Object.keys(this.props.tier_1_scanners['ocr_scene_analysis']).includes(osa_key)) {
        return false
      }
      if (!Object.keys(this.props.tier_1_matches['ocr_scene_analysis']).includes(osa_key)) {
        return false
      }
      const frameset_hash = this.props.getFramesetHashForImageUrl(this.state.insights_image)
      const frameset_hashes = Object.keys(
        this.props.tier_1_matches['ocr_scene_analysis'][osa_key]['movies'][this.props.movie_url]['framesets']
      )
      return frameset_hashes.includes(frameset_hash)
    } else {
      return false
    }
  }

  setScrubberToIndex(the_value) {
    document.getElementById('movie_scrubber').value = the_value
    this.scrubberOnChange()
  }

  runCallbackFunction(function_name) {
    if (Object.keys(this.state.callbacks).includes(function_name)) {
      return this.state.callbacks[function_name]()
    }
    return []
  }

  getCurrentAreasToRedact() {
    if (!this.state.insights_image) {
      return []
    }
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
    if (Object.keys(this.props.tier_1_matches['ocr']).includes(this.props.tier_1_scanner_current_ids['ocr'])) {
      const this_ocr_rule_matches = this.props.tier_1_matches['ocr'][this.props.tier_1_scanner_current_ids['ocr']]  
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

  setModalImage(the_url) {
    this.setState({
      modal_image: the_url,
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
    if (this.props.tier_1_scanner_current_ids['selected_area'] && 
        Object.keys(this.props.tier_1_scanners['selected_area']).includes(
          this.props.tier_1_scanner_current_ids['selected_area']
        )) {
      return this.props.tier_1_scanners['selected_area'][this.props.tier_1_scanner_current_ids['selected_area']]
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

    const scanner_operations = {
      template: 'scan_template_threaded',
      hog: 'hog_test',
      ocr: 'scan_ocr',
      selected_area: 'selected_area_threaded',
      ocr_scene_analysis: 'ocr_scene_analysis_threaded',
      ocr_movie_analysis: 'oma_first_scan_threaded',
      entity_finder: 'entity_finder_threaded',
    }
    if (!this.props.tier_1_scanner_current_ids[scanner_type]) {
      this.displayInsightsMessage('no ' + scanner_type + ' rule selected, cannot submit a job')
      return
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = scanner_operations[scanner_type]
    const cur_scanner_id = this.props.tier_1_scanner_current_ids[scanner_type]
    const cur_scanner = this.props.tier_1_scanners[scanner_type][cur_scanner_id]
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners'][scanner_type] = {}
    job_data['request_data']['tier_1_scanners'][scanner_type][cur_scanner_id] = cur_scanner
    job_data['request_data']['id'] = cur_scanner_id
    job_data['request_data']['scan_level'] = 'tier_1'
    job_data['description'] = scanner_type + ' (' + cur_scanner['name'] + ') '

    this.buildT1MovieData(job_data, scope, extra_data)
    return job_data
  }

  buildT1MovieData(job_data, scope, extra_data) {
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
      const t1_template = this.props.tier_1_scanners['template'][template_id]
      const tier_1_output = this.props.tier_1_matches['template'][template_id]['movies']
      job_data['description'] += 'on t1 template results (template ' + t1_template['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_selected_area$/)) {   
      const selected_area_id = extra_data
      const t1_selected_area_meta = this.props.tier_1_scanners['selected_area'][selected_area_id]
      const tier_1_output = this.props.tier_1_matches['selected_area'][selected_area_id]['movies']
      job_data['description'] += 'on t1 selected area results (sa ' + t1_selected_area_meta['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_ocr$/)) {   
      const ocr_id = extra_data
      const t1_ocr_rule = this.props.tier_1_scanners['ocr'][ocr_id]
      const tier_1_output = this.props.tier_1_matches['ocr'][ocr_id]['movies']
      job_data['description'] += 'on t1 ocr results (ocr ' + t1_ocr_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_osa$/)) {   
      const osa_id = extra_data
      const t1_osa_rule = this.props.tier_1_scanners['ocr_scene_analysis'][osa_id]
      const tier_1_output = this.props.tier_1_matches['ocr_scene_analysis'][osa_id]['movies']
      job_data['description'] += 'on t1 osa results (osa ' + t1_osa_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_telemetry$/)) {   
      const telemetry_id = extra_data
      const telemetry_rule = this.props.tier_1_scanners['telemetry'][telemetry_id]
      const tier_1_output = this.props.tier_1_matches['telemetry'][telemetry_id]['movies']
      job_data['description'] += 'on t1 telemetry results (telemetry ' + telemetry_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    }
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

  buildRedactJobData(job_type, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact'
    job_data['request_data']['mask_method'] = this.props.mask_method
    job_data['request_data']['meta'] = {
      return_type: 'url',
      preserve_working_dir_across_batch: true,
    }
    if (job_type === 'redact_current_movie') {
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['description'] = 'redact movie: ' + this.props.movie_url
    } else if (job_type === 'redact_all_movies') {
      job_data['request_data']['movies'] = this.props.movies
      job_data['description'] = 'redact all movies'
    }
    return job_data
  }

  buildRedactedMovieFilename() {
    //TODO this is not friendly to file names with more than one period, or with a slash in them
    // TODO this method is duplicated in MoviePanel
    let parts = this.props.movie_url.split('/')
    let file_parts = parts[parts.length-1].split('.')
    let new_filename = file_parts[0] + '_redacted.' + file_parts[1]
    return new_filename
  }

  buildImageUrlsToZip(movie) {
    // TODO this is method duplicated in MoviePanel
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

  buildZipJobData(job_type, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'zip_movie'
    job_data['request_data']['new_movie_name'] = this.buildRedactedMovieFilename()
    if (job_type === 'zip_current_movie') {
      job_data['description'] = 'zip movie: ' + this.props.movie_url
      const movie = this.props.movies[this.props.movie_url]
      const image_urls = this.buildImageUrlsToZip(movie)
      job_data['request_data']['image_urls'] = image_urls
    } else if (job_type === 'zip_all_movies') {
      // TODO build this when we support multiple movie zip in one job
      job_data['description'] = 'zip all movies'
    }
    return job_data
  }

  buildTrainHogModelJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'hog_train_threaded'

    const hog_id = this.props.tier_1_scanner_current_ids['hog']
    const hog_rule = this.props.tier_1_scanners['hog'][hog_id]
    job_data['request_data'] = {
      tier_1_scanners: {
        hog: {
        }
      }
    }
    job_data['request_data']['tier_1_scanners']['hog'][hog_id] = hog_rule
    job_data['request_data']['scan_level'] = 'tier_1'
    job_data['request_data']['id'] = hog_id

    let movie_ids = []
    for (let i=0; i < Object.keys(hog_rule['training_images']).length; i++) {
      const tim_id = Object.keys(hog_rule['training_images'])[i]
      const tim = hog_rule['training_images'][tim_id]
      if (!movie_ids.includes(tim['movie_url'])) {
        movie_ids.push(tim['movie_url'])
      }
    }
    for (let i=0; i < Object.keys(hog_rule['testing_images']).length; i++) {
      const tim_id = Object.keys(hog_rule['testing_images'])[i]
      const tim = hog_rule['testing_images'][tim_id]
      if (!movie_ids.includes(tim['movie_url'])) {
        movie_ids.push(tim['movie_url'])
      }
    }
    job_data['request_data']['movies'] = {}
    for (let i=0; i < movie_ids.length; i++) {
      const movie_url = movie_ids[i]
      const movie = this.props.movies[movie_url]
      job_data['request_data']['movies'][movie_url] = movie
    }

    job_data['description'] = 'train hog rule ('  + hog_rule['name'] + ')'
    return job_data
  }

  buildResultsData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = extra_data['type']
    job_data['request_data']['job_ids'] = [extra_data['job_id']]
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
    const telemetry_rule = this.props.tier_1_scanners['telemetry'][this.props.tier_1_scanner_current_ids['telemetry']]
    job_data['app'] = 'analyze'
    job_data['operation'] = 'telemetry_find_matching_frames'
    job_data['request_data']['telemetry_data'] = this.props.telemetry_data
    job_data['request_data']['telemetry_rule'] = telemetry_rule
    job_data['request_data']['id'] = this.props.tier_1_scanner_current_ids['telemetry']
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
    job_data['request_data']['recording_ids'] = [extra_data]
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
        job_string === 'ocr_t1_osa' || 
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
        job_string === 'template_t1_osa' || 
        job_string === 'template_t1_telemetry' || 
        job_string === 'template_current_movie' || 
        job_string === 'template_all_movies'
    ) {
      let job_data = this.buildTier1JobData('template', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'hog_train_model') {
      let job_data = this.buildTrainHogModelJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    } else if (
        job_string === 'hog_current_frame' || 
        job_string === 'hog_current_movie' || 
        job_string === 'hog_all_movies'
    ) {
      let job_data = this.buildTier1JobData('hog', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'selected_area_t1_template' || 
        job_string === 'selected_area_t1_ocr' || 
        job_string === 'selected_area_t1_osa' || 
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
    } else if (
        job_string === 'ocr_scene_analysis_current_frame' ||
        job_string === 'ocr_scene_analysis_current_movie' ||
        job_string === 'ocr_scene_analysis_all_movies'
    ) {
      let job_data = this.buildTier1JobData('ocr_scene_analysis', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'entity_finder_current_frame' ||
        job_string === 'entity_finder_current_movie' ||
        job_string === 'entity_finder_all_movies'
    ) {
      let job_data = this.buildTier1JobData('entity_finder', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'oma_first_scan_current_movie' ||
        job_string === 'oma_first_scan_all_movies'
    ) {
      let job_data = this.buildTier1JobData('ocr_movie_analysis', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'redact_current_movie' ||
        job_string === 'redact_all_movies'
    ) {
      let job_data = this.buildRedactJobData(job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string === 'zip_current_movie' ||
        job_string === 'zip_all_movies'
    ) {
      let job_data = this.buildZipJobData(job_string, extra_data)
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
    if (this.props.tier_1_scanner_current_ids['template']) {
      let key = this.props.tier_1_scanner_current_ids['template']
      if (!Object.keys(this.props.tier_1_scanners['template']).includes(key)) {
        return false
      }
      let template = this.props.tier_1_scanners['template'][key]
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
    if (this.props.tier_1_scanner_current_ids['selected_area']) {
      let key = this.props.tier_1_scanner_current_ids['selected_area']
      if (!Object.keys(this.props.tier_1_scanners['selected_area']).includes(key)) {
        return false
      }
      let sam = this.props.tier_1_scanners['selected_area'][key]
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

  currentImageIsHogTestingImage() {
    return this.currentImageIsHogWhateverImage('testing_images')
  }

  currentImageIsHogTrainingImage() {
    return this.currentImageIsHogWhateverImage('training_images')
  }

  currentImageIsHogWhateverImage(group_key) {
    if (this.props.tier_1_scanner_current_ids['hog']) {
      let key = this.props.tier_1_scanner_current_ids['hog']
      if (!Object.keys(this.props.tier_1_scanners['hog']).includes(key)) {
        return false
      }
      let scanner = this.props.tier_1_scanners['hog'][key]
      if (!Object.keys(scanner).includes(group_key)) {
        return false
      }
      if (!Object.keys(scanner[group_key]).length) {
        return false
      }
      for (let i=0; i < Object.keys(scanner[group_key]).length; i++) {
        const ti_key = Object.keys(scanner[group_key])[i]
        const ti = scanner[group_key][ti_key]
        if (ti['image_url'] === this.state.insights_image) {
          return true
        }
      }
      return false
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

  callGetVersion() {
    this.props.doGetVersion(this.afterGetVersionSuccess, this.afterGetVersionFailure)
  }

  afterGetVersionSuccess(responseJson) {
    const version = responseJson.version
    this.displayInsightsMessage('version is '+version)
  }

  afterGetVersionFailure(error) {
    console.error(error);
    this.displayInsightsMessage('get version failed')
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
    } else if (the_mode === 'oma_pick_app') {
      the_message = 'select the app'
    } else if (the_mode === 'hog_pick_training_image_1') {
      the_message = 'pick the upper left corner of the hog image'
    } else if (the_mode === 'hog_pick_training_image_2') {
      the_message = 'pick the lower right corner of the hog image'
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
      insights_message: '.',
    }, this.setImageSize(first_image))
  }

  setCurrentVideo(video_url, when_done=(()=>{})) {
    this.props.setActiveMovie(video_url, this.movieSplitDone)
  }

  setInsightsImage(image_url, when_done=(()=>{})) {
    this.setState({
      insights_image: image_url,
    })
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
    } else if (this.state.mode === 'hog_pick_training_image_1') {
      this.handleSetMode('hog_pick_training_image_2') 
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
    if (!this.state.insights_image) {
      return
    }
    const current_scanner_id = this.props.tier_1_scanner_current_ids[scanner_type]
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
    if (!Object.keys(this.props.annotations).includes(this.props.tier_1_scanner_current_ids['template'])) {
      return
    }
    const cur_templates_matches = this.props.annotations[this.props.tier_1_scanner_current_ids['template']]
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
    } else if (this.props.movie_url) {
      bottom_y += 385
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
    } else if (this.state.modal_image) {
      return (
        <div className="modal" id='insightsPanelModal' tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl" id='insightsPanelModalInner' role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Viewing Image</h5>
              </div>
              <div className="modal-body">
                <img
                    id='insights_modal_image'
                    src={this.state.modal_image}
                    alt='stuff'
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      return ''
    }
  }

  getInsightsImage() {
    if (this.state.insights_image) {
      return this.state.insights_image
    } else if (this.props.movie_url) {
      if (!Object.keys(this.props.movies).includes(this.props.movie_url)) {
        return
      }
      const frameset_hashes = this.props.getFramesetHashesInOrder()
      if (!Object.keys(this.props.movies).includes(this.props.movie_url)) {
        return
      }
      const movie = this.props.movies[this.props.movie_url]
      if (!Object.keys(movie).includes('framesets')) {
        return
      }
      const image_url = movie['framesets'][frameset_hashes[0]]['images'][0]
      return image_url
    }
  }

  buildImageElement(insights_image) {
    if (insights_image) {
      return (
        <img 
            id='insights_image' 
            src={insights_image}
            alt={insights_image}
        />
      )
    } else {
      const the_style = {
        'height': '350px',
        'width': '650px',
        'paddingTop': '150px',
      }
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

  buildScrubberDiv(insights_image) {
    let display_attr = 'block'
    if (!insights_image) {
      display_attr = 'none'
    }
    let bottom_y = this.getScrubberHeight()
    const scrubber_style = {
      top: bottom_y,
      display: display_attr,
    }
    return (
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
    )
  }

  render() {
    const insights_modal = this.buildInsightsModal()

    document.body.onkeydown = this.handleKeyDown
    let workbook_name = this.props.current_workbook_name
    const insights_image = this.getInsightsImage()
    const image_element = this.buildImageElement(insights_image)
    const scrubber_div = this.buildScrubberDiv(insights_image)
    if (!this.props.current_workbook_id) {
      workbook_name += ' (unsaved)'
    }
    let imageDivStyle= {
      width: this.props.image_width,
      height: this.props.image_height,
    }
    return (
    <div className='container'>
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
            tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
            getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
            getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
            setScrubberToIndex={this.setScrubberToIndex}
            insights_image={insights_image}
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
            {image_element}
            <CanvasInsightsOverlay 
              width={this.state.image_width}
              height={this.state.image_height}
              clickCallback={this.handleImageClick}
              currentImageIsTemplateAnchorImage={this.currentImageIsTemplateAnchorImage}
              currentImageIsSelectedAreaAnchorImage={this.currentImageIsSelectedAreaAnchorImage}
              currentImageIsOcrAnchorImage={this.currentImageIsOcrAnchorImage}
              currentImageIsOsaMatchImage={this.currentImageIsOsaMatchImage}
              currentImageIsHogTrainingImage={this.currentImageIsHogTrainingImage}
              currentImageIsHogTestingImage={this.currentImageIsHogTestingImage}
              insights_image_scale={this.state.insights_image_scale}
              getTier1ScannerMatches={this.getTier1ScannerMatches}
              getAnnotations={this.getAnnotations}
              mode={this.state.mode}
              clicked_coords={this.state.clicked_coords}
              getCurrentOcrMatches={this.getCurrentOcrMatches}
              getCurrentAreasToRedact={this.getCurrentAreasToRedact}
              movie_url={this.props.movie_url}
              getCurrentHogTrainingImageLocations={(()=>this.runCallbackFunction('getCurrentHogTrainingImageLocations'))}
              getCurrentHogTestingImageLocations={(()=>this.runCallbackFunction('getCurrentHogTestingImageLocations'))}
              getCurrentTemplateAnchors={(()=>this.runCallbackFunction('getCurrentTemplateAnchors'))}
              getCurrentTemplateMaskZones={(()=>this.runCallbackFunction('getCurrentTemplateMaskZones'))}
              getCurrentOcrWindow={(()=>this.runCallbackFunction('getOcrWindow'))}
              getCurrentSelectedAreaCenters={(()=>this.runCallbackFunction('getCurrentSelectedAreaCenters'))}
              getCurrentSelectedAreaMinimumZones={(()=>this.runCallbackFunction('getCurrentSelectedAreaMinimumZones'))}
              getCurrentSelectedAreaOriginLocation={(()=>this.runCallbackFunction('getCurrentSelectedAreaOriginLocation'))}
              getCurrentOcrOriginLocation={(()=>this.runCallbackFunction('getCurrentOcrOriginLocation'))}
              getCurrentOcrSceneAnalysisMatches={this.getCurrentOcrSceneAnalysisMatches}
            />
          </div>

          {scrubber_div}

          <BottomInsightsControls 
            setGlobalStateVar={this.props.setGlobalStateVar}
            toggleGlobalStateVar={this.props.toggleGlobalStateVar}
            handleSetMode={this.handleSetMode}
            tier_1_matches={this.props.tier_1_matches}
            insights_image={insights_image}
            movie_url={this.props.movie_url}
            callPing={this.callPing}
            callGetVersion={this.callGetVersion}
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
            visibilityFlags={this.props.visibilityFlags}
            toggleShowVisibility={this.props.toggleShowVisibility}
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
            setInsightsImage={this.setInsightsImage}
            saveScannerToDatabase={this.props.saveScannerToDatabase}
            scanners={this.props.scanners}
            getScanners={this.props.getScanners}
            deleteScanner={this.props.deleteScanner}
            importScanner={this.props.importScanner}
            preserve_movie_audio={this.props.preserve_movie_audio}
            setSelectedAreaMetas={this.props.setSelectedAreaMetas}
            pipelines={this.props.pipelines}
            current_pipeline_id={this.props.current_pipeline_id}
            getPipelines={this.props.getPipelines}
            dispatchPipeline={this.props.dispatchPipeline}
            deletePipeline={this.props.deletePipeline}
            savePipelineToDatabase={this.props.savePipelineToDatabase}
            jobs={this.props.jobs}
            results={this.props.results}
            app_codebooks={this.props.app_codebooks}
            tier_1_scanners={this.props.tier_1_scanners}
            tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
            setModalImage={this.setModalImage}
            mask_method={this.props.mask_method}
            impersonateUser={this.props.impersonateUser}
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
            attachToJob={this.props.attachToJob}
            attached_job={this.props.attached_job}
          />
        </div>
      </div>
    </div>
    )
  }
}

export default InsightsPanel;
