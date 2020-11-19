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
      prev_coords: (0,0),
      clicked_coords: (0,0),
      selected_area_template_anchor: '',
      draggedId: null,
      imageTypeToDisplay: '',
      callbacks: {},
    }
    this.getAnnotations=this.getAnnotations.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.setInsightsImage=this.setInsightsImage.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.getTier1ScannerMatches=this.getTier1ScannerMatches.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.currentImageIsSelectedAreaAnchorImage=this.currentImageIsSelectedAreaAnchorImage.bind(this)
    this.currentImageIsMeshMatchAnchorImage=this.currentImageIsMeshMatchAnchorImage.bind(this)
    this.currentImageIsOsaMatchImage=this.currentImageIsOsaMatchImage.bind(this)
    this.currentImageIsSGAnchorImage=this.currentImageIsSGAnchorImage.bind(this)
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
    this.setImageTypeToDisplay=this.setImageTypeToDisplay.bind(this)
    this.addInsightsCallback=this.addInsightsCallback.bind(this)
    this.getCurrentOcrMatches=this.getCurrentOcrMatches.bind(this)
    this.getCurrentPipelineMatches=this.getCurrentPipelineMatches.bind(this)
    this.getCurrentSelectionGrowerZones=this.getCurrentSelectionGrowerZones.bind(this)
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

  getCurrentPipelineMatches() {
    if (Object.keys(this.props.tier_1_matches['pipeline']).includes(this.props.tier_1_scanner_current_ids['pipeline'])) {
      const this_pipeline_matches = this.props.tier_1_matches['pipeline'][this.props.tier_1_scanner_current_ids['pipeline']]  
      if (Object.keys(this_pipeline_matches['movies']).includes(this.props.movie_url)) {
        const this_movies_matches = this_pipeline_matches['movies'][this.props.movie_url]
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

  getCurrentSelectionGrowerZones() {
    const sg_id = this.props.tier_1_scanner_current_ids['selection_grower']
    if (Object.keys(this.props.tier_1_matches['selection_grower']).includes(sg_id)) {
      const matches = this.props.tier_1_matches['selection_grower'][sg_id]  
      if (Object.keys(matches['movies']).includes(this.props.movie_url)) {
        const this_movies_matches = matches['movies'][this.props.movie_url]
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

  getJobForId(job_id) {
    for (let i=0; i < this.props.jobs.length; i++) {
      if (this.props.jobs[i]['id'] === job_id) {
        return this.props.jobs[i]
      }
    }
  }

  afterMovieSplitInsightsJobLoaded(movie) {
    this.displayInsightsMessage('insights job loaded')
    this.movieSplitDone(movie)
  }

  componentDidMount() {
    this.scrubberOnChange()
    if (Object.keys(this.props.getCurrentFramesets()).length > 0) {
      this.movieSplitDone(this.props.movies[this.props.movie_url])
    }
    this.props.getJobs()
    this.props.getWorkbooks()
    this.props.getPipelines()
    document.getElementById('insights_link').classList.add('active')
    this.props.setActiveWorkflow('')
  }

  componentWillUnmount() {                                                      
    document.getElementById('insights_link').classList.remove('active')          
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

  buildDataSifterBuildJobData(job_string, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'build_data_sifter'

    const data_sifter_id = this.props.tier_1_scanner_current_ids['data_sifter']
    const data_sifter = this.props.tier_1_scanners['data_sifter'][data_sifter_id]
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners']['data_sifter'] = {}
    job_data['request_data']['tier_1_scanners']['data_sifter'][data_sifter_id] = data_sifter
    job_data['request_data']['id'] = data_sifter_id
    job_data['description'] = 'build data sifter (' + data_sifter.name + ')'

    job_data['request_data']['movies'] = {}
    if (job_string === 'data_sifter_build_t1_selected_area') {
      // extra data has the selected area id
      const sa_movies = this.props.tier_1_matches['selected_area'][extra_data]['movies']
      const sa_movie_urls = Object.keys(sa_movies)
      job_data['request_data']['movies'] = sa_movies
      let build_source_movies = {}
      for (let i=0; i < sa_movie_urls.length; i++) {
        const movie_url = sa_movie_urls[i]
        const the_movie = this.props.movies[movie_url]
        build_source_movies[movie_url] = the_movie
      }
      job_data['request_data']['movies']['source'] = build_source_movies
    }
    return job_data
  }

  buildTier1JobData(scanner_type, scope, extra_data) {
    let job_data = {
      request_data: {},
    }

    const scanner_operations = {
      template: 'scan_template_threaded',
      ocr: 'scan_ocr_threaded',
      selected_area: 'selected_area_threaded',
      selection_grower: 'selection_grower_threaded',
      mesh_match: 'mesh_match_threaded',
      ocr_scene_analysis: 'ocr_scene_analysis_threaded',
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
    } else if (scope.match(/_t1_mesh_match$/)) {   
      const osa_id = extra_data
      const t1_osa_rule = this.props.tier_1_scanners['mesh_match'][osa_id]
      const tier_1_output = this.props.tier_1_matches['mesh_match'][osa_id]['movies']
      job_data['description'] += 'on t1 mesh_match results (mm ' + t1_osa_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_selection_grower$/)) {   
      const osa_id = extra_data
      const t1_osa_rule = this.props.tier_1_scanners['selection_grower'][osa_id]
      const tier_1_output = this.props.tier_1_matches['selection_grower'][osa_id]['movies']
      job_data['description'] += 'on t1 selection_grower results (mm ' + t1_osa_rule['name'] + ')'
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

  buildRedactJobData(job_type, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'redact'
    job_data['operation'] = 'redact'

    if (
      this.props.redact_rule_current_id &&
      Object.keys(this.props.redact_rules).includes(this.props.redact_rule_current_id)
    ) {
      job_data['request_data']['redact_rule'] = this.props.redact_rules[this.props.redact_rule_current_id]
    }

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

  buildPingCvWorkerJobData(extra_data) {
    let job_data = {}
    job_data['app'] = 'parse'
    job_data['operation'] = 'ping_cv_worker'
    job_data['description'] = 'ping cv worker'
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
    } else if (job_string === 'results') {
      let job_data = this.buildResultsData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'ping_cv_worker') {
      let job_data = this.buildPingCvWorkerJobData(extra_data)
      this.props.submitJob({
        job_data: job_data
      })
    }
    if (!this.props.movie_url) {
      this.displayInsightsMessage('no movie loaded, cannot submit a job')
      return
    }
    if (
        job_string.startsWith('ocr_scene_analysis_')
    ) {
      let job_data = this.buildTier1JobData('ocr_scene_analysis', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('ocr_')
    ) {
      let job_data = this.buildTier1JobData('ocr', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('template_')
    ) {
      let job_data = this.buildTier1JobData('template', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('selected_area_')
    ) {
      let job_data = this.buildTier1JobData('selected_area', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('mesh_match_')
    ) {
      let job_data = this.buildTier1JobData('mesh_match', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('selection_grower_')
    ) {
      let job_data = this.buildTier1JobData('selection_grower', job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('data_sifter_build_')
    ) {
      let job_data = this.buildDataSifterBuildJobData(job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('redact_')
    ) {
      let job_data = this.buildRedactJobData(job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (
        job_string.startsWith('zip_')
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

// todo push this into SelectedAreaController, with a callback, same for template stuff
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
      if (!sam['areas'].length && !sam['minimum_zones'].length) {
        return false
      }
      let cur_sam_anchor_image_name = ''
      if (sam['areas'].length > 0) {
        cur_sam_anchor_image_name = sam['areas'][0]['image']
      } else if (sam['minimum_zones'].length > 0) {
        cur_sam_anchor_image_name = sam['minimum_zones'][0]['image']
      }
      return (cur_sam_anchor_image_name === this.state.insights_image)
    } else {
      return true
    }
  }

  currentImageIsMeshMatchAnchorImage() {
    if (this.props.tier_1_scanner_current_ids['mesh_match']) {
      let key = this.props.tier_1_scanner_current_ids['mesh_match']
      if (!Object.keys(this.props.tier_1_scanners['mesh_match']).includes(key)) {
        return false
      }
      let sam = this.props.tier_1_scanners['mesh_match'][key]
      if (!sam['maximum_zones'].length && !sam['minimum_zones'].length) {
        return false
      }
      let cur_sam_anchor_image_name = ''
      if (sam['minimum_zones'].length > 0) {
        cur_sam_anchor_image_name = sam['minimum_zones'][0]['image']
      } else if (sam['maximum_zones'].length > 0) {
        cur_sam_anchor_image_name = sam['maximum_zones'][0]['image']
      }
      return (cur_sam_anchor_image_name === this.state.insights_image)
    } else {
      return true
    }
  }

  currentImageIsSGAnchorImage() {
    if (this.props.tier_1_scanner_current_ids['selection_grower']) {
      let key = this.props.tier_1_scanner_current_ids['selection_grower']
      if (!Object.keys(this.props.tier_1_scanners['selection_grower']).includes(key)) {
        return false
      }
      let sam = this.props.tier_1_scanners['selection_grower'][key]
      if (!sam['colors'].length && !sam['colors'].length) {
        return false
      }
      let cur_sam_anchor_image_name = ''
      if (sam['colors'].length > 0) {
        cur_sam_anchor_image_name = sam['colors'][0]['image']
      }
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
    } else if (the_mode === 'selected_area_maximum_zones_1') {
      the_message = 'Select the upper left corner of the zone'
    } else if (the_mode === 'selected_area_maximum_zones_2') {
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
    }
    this.props.setGlobalStateVar('message', the_message)
    this.setState({
      mode: the_mode,
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
    this.props.setGlobalStateVar('message', the_message)
  }

  movieSplitDone(new_movie) {
    const len = Object.keys(new_movie['framesets']).length
    document.getElementById('movie_scrubber').max = len-1
    const first_image = new_movie['frames'][0]
    this.props.setGlobalStateVar('message', '.')
    this.setState({
      insights_image: first_image,
      insights_title: first_image,
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
    const imageEl = document.getElementById('insights_image');
    const scale = (
      ((imageEl && imageEl.width) || 100) / ((imageEl && imageEl.naturalWidth) || 100)
    );
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
    if (!document.getElementById('insights_image')) {
      return
    }
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
    let the_message = this.props.message
    let message_style = {}
    if (!the_message || the_message === '.') {
      the_message = '.'
      message_style['color'] = 'white'
    }
    return (
    <div className='container'>
      <div id='insights_panel' className='row mt-5'>
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
              <div className='row' id='message' style={message_style}>
                {the_message}
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
              currentImageIsMeshMatchAnchorImage={this.currentImageIsMeshMatchAnchorImage}
              currentImageIsSGAnchorImage={this.currentImageIsSGAnchorImage}
              currentImageIsOsaMatchImage={this.currentImageIsOsaMatchImage}
              insights_image_scale={this.state.insights_image_scale}
              getTier1ScannerMatches={this.getTier1ScannerMatches}
              getAnnotations={this.getAnnotations}
              mode={this.state.mode}
              clicked_coords={this.state.clicked_coords}
              getCurrentOcrMatches={this.getCurrentOcrMatches}
              getCurrentAreasToRedact={this.getCurrentAreasToRedact}
              movie_url={this.props.movie_url}
              getCurrentTemplateAnchors={(()=>this.runCallbackFunction('getCurrentTemplateAnchors'))}
              getCurrentTemplateMaskZones={(()=>this.runCallbackFunction('getCurrentTemplateMaskZones'))}
              getCurrentOcrWindow={(()=>this.runCallbackFunction('getOcrWindow'))}
              getCurrentSelectedAreaCenters={(()=>this.runCallbackFunction('getCurrentSelectedAreaCenters'))}
              getCurrentSelectedAreaMinimumZones={(()=>this.runCallbackFunction('getCurrentSelectedAreaMinimumZones'))}
              getCurrentSelectedAreaMaximumZones={(()=>this.runCallbackFunction('getCurrentSelectedAreaMaximumZones'))}
              getCurrentSelectedAreaOriginLocation={(()=>this.runCallbackFunction('getCurrentSelectedAreaOriginLocation'))}
              getCurrentMeshMatchMinimumZones={(()=>this.runCallbackFunction('getCurrentMeshMatchMinimumZones'))}
              getCurrentMeshMatchMaximumZones={(()=>this.runCallbackFunction('getCurrentMeshMatchMaximumZones'))}
              getCurrentSGColors={(()=>this.runCallbackFunction('getCurrentSGColors'))}
              getCurrentMeshMatchOriginLocation={(()=>this.runCallbackFunction('getCurrentMeshMatchOriginLocation'))}
              getCurrentOcrSceneAnalysisMatches={this.getCurrentOcrSceneAnalysisMatches}
              getCurrentPipelineMatches={this.getCurrentPipelineMatches}
              getCurrentSelectionGrowerZones={this.getCurrentSelectionGrowerZones}
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
            draggedId={this.state.draggedId}
            visibilityFlags={this.props.visibilityFlags}
            toggleShowVisibility={this.props.toggleShowVisibility}
            campaign_movies={this.props.campaign_movies}
            setCampaignMovies={this.props.setCampaignMovies}
            updateGlobalState={this.props.updateGlobalState}
            setImageTypeToDisplay={this.setImageTypeToDisplay}
            imageTypeToDisplay={this.state.imageTypeToDisplay}
            whenDoneTarget={this.props.whenDoneTarget}
            files={this.props.files}
            getFiles={this.props.getFiles}
            deleteFile={this.props.deleteFile}
            frameset_discriminator={this.props.frameset_discriminator}
            preserveAllJobs={this.props.preserveAllJobs}
            addInsightsCallback={this.addInsightsCallback}
            clicked_coords={this.state.clicked_coords}
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
            importRedactRule={this.props.importRedactRule}
            preserve_movie_audio={this.props.preserve_movie_audio}
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
            redact_rules={this.props.redact_rules}
            redact_rule_current_id={this.props.redact_rule_current_id}
            impersonateUser={this.props.impersonateUser}
            cv_workers={this.props.cv_workers}
            queryCvWorker={this.props.queryCvWorker}
            dispatchFetchSplitAndHash={this.props.dispatchFetchSplitAndHash}
            deleteOldJobs={this.props.deleteOldJobs}
            job_polling_interval_seconds={this.props.job_polling_interval_seconds}
            telemetry_data={this.props.telemetry_data}
            getJobResultData={this.props.getJobResultData}
            runExportTask={this.props.runExportTask}
            postImportArchiveCall={this.props.postImportArchiveCall}
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
            getJobFailedTasks={this.props.getJobFailedTasks}
            wrapUpJob={this.props.wrapUpJob}
            attachToJob={this.props.attachToJob}
            attached_job={this.props.attached_job}
            user={this.props.user}
          />
        </div>
      </div>
    </div>
    )
  }
}

export default InsightsPanel;
