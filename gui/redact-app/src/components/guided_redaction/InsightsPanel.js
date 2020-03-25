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
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
  }

  setScrubberToIndex(the_value) {
    document.getElementById('movie_scrubber').value = the_value
    this.scrubberOnChange()
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

  buildScanOcrMovieJobData(scope, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_ocr_movie'
    if (scope === 'current_movie') {
      job_data['description'] = 'scan ocr for one movie: ' + this.props.movie_url
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    } else if (scope === 'all_movies') {
      job_data['description'] = 'scan ocr for all movies'
      job_data['request_data']['movies'] = this.props.movies
    } else if (scope === 'current_frame') {
      job_data['description'] = 'scan ocr for one frame: ' + this.state.insights_image
      job_data['request_data']['movies'] = this.buildOneFrameMovieForCurrentInsightsImage()
    }
    let start_coords = extra_data['start_coords']
    let end_coords = extra_data['end_coords']
    const scan_area_object = {
      'start': start_coords,
      'end': end_coords,
    }
    job_data['request_data']['scan_area'] = scan_area_object
    job_data['request_data']['match_text'] = extra_data['match_text']
    job_data['request_data']['match_percent'] = extra_data['match_percent']
    job_data['request_data']['skip_east'] = extra_data['skip_east']
    job_data['request_data']['scan_level'] = extra_data['scan_level']
    job_data['request_data']['id'] = extra_data['id']
    return job_data
  }

  buildScanTemplateCurTempCurMovJobData(scope, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template'
    let template = this.props.templates[this.props.current_template_id]
    let template_wrap = {}
    template_wrap[this.props.current_template_id] = template
    job_data['request_data']['templates'] = template_wrap
    job_data['request_data']['template_id'] = this.props.current_template_id
    if (scope === 'movie') {
      job_data['description'] = 'single template single movie match: '
      job_data['description'] += 'template ' + template.name
      job_data['description'] += ', movie ' + this.props.movie_url.split('/').slice(-1)[0]
      let movies_wrap = {}
      movies_wrap[this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['request_data']['movies'] = movies_wrap
    } else if (scope === 'frame') {
      job_data['description'] = 'single template single frame match: '
      job_data['description'] += 'template ' + template.name
      job_data['request_data']['movies'] = this.buildOneFrameMovieForCurrentInsightsImage()
    }
    if (!template['scale'] === '1_1') {
      job_data['description'] += ' - multi scale (' + template['scale'] + ')'
    }
    job_data['request_data']['scan_level'] = template['scan_level']
    job_data['request_data']['id'] = this.props.current_template_id
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
    return movies_wrap
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
    let template_wrap = {}
    template_wrap[this.props.current_template_id] = template
    job_data['description'] += ': template '+ template['name']
    if (!template['scale'] === '1_1') {
      job_data['description'] += ' - multi scale (' + template['scale'] + ')'
    }
    job_data['request_data']['templates'] = template_wrap
    job_data['request_data']['template_id'] = this.props.current_template_id
    job_data['request_data']['movies'] = this.props.movies
    job_data['request_data']['scan_level'] = template['scan_level']
    job_data['request_data']['id'] = this.props.current_template_id
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
    let template_wrap = {}
    template_wrap[this.props.current_template_id] = template
    job_data['description'] = 'single template (' + template['name'] + ') '+ num_movies+ ' movies (from MovieSet ' + movie_set_name + '), match - threaded'
    job_data['description'] += ': template '+ template['name']
    job_data['request_data']['templates'] = template_wrap
    job_data['request_data']['template_id'] = this.props.current_template_id
    job_data['request_data']['movies'] = movies_to_run
    job_data['request_data']['scan_level'] = template['scan_level']
    job_data['request_data']['id'] = this.props.current_template_id
    return job_data
  }

  buildScanTemplateCurTempTier1JobData(scanner_type='template', extra_data) {
    let job_data = {
      request_data: {},
    }
    const tier_1_scanner_id = extra_data
    const movie_build_obj = this.buildTierOneMatchesMovieObject(scanner_type, tier_1_scanner_id)
    const counts = this.getCountsFromMovieBuildObj(movie_build_obj)

    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template_threaded'
    let template = this.props.templates[this.props.current_template_id]
    let template_wrap = {}
    template_wrap[this.props.current_template_id] = template
    job_data['description'] = 'single template match (template ' + template['name'] + ') '
    job_data['description'] += counts['movie'].toString() + ' movies '
    job_data['description'] += counts['frameset'].toString() + ' framesets'
    job_data['description'] += ' using ' + scanner_type + ' rule ' + extra_data
    job_data['request_data']['templates'] = template_wrap
    job_data['request_data']['template_id'] = this.props.current_template_id
    job_data['request_data']['movies'] = movie_build_obj
    job_data['request_data']['scan_level'] = template['scan_level']
    job_data['request_data']['id'] = this.props.current_template_id
    return job_data
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

  buildTierOneMatchesMovieObject(scanner_type, tier_1_scanner_id) {
    const tier_1_movie_matches = this.props.tier_1_matches[scanner_type][tier_1_scanner_id]['movies']
    let movie_build_obj = {}
    movie_build_obj = {}
    for (let i=0; i < Object.keys(tier_1_movie_matches).length; i++) {
      const movie_url = Object.keys(tier_1_movie_matches)[i]
      movie_build_obj[movie_url] = {}
      movie_build_obj[movie_url]['framesets'] = {}
      const frameset_hashes = Object.keys(tier_1_movie_matches[movie_url]['framesets'])
      for (let j=0; j < frameset_hashes.length; j++) {
        const frameset_hash = frameset_hashes[j]
        const movie_frameset = this.props.movies[movie_url]['framesets'][frameset_hash]
        movie_build_obj[movie_url]['framesets'][frameset_hash] = movie_frameset
      }
    }
    return movie_build_obj
  }

  buildScanTemplateCurTempTelemetryMatchesJobData(extra_data) {
    if (!this.props.current_telemetry_rule_id) {
      this.displayInsightsMessage('no telemetry rule selected, cannot submit a job')
      return
    }
    let job_data = {
      request_data: {},
    }
    let num_frames = 0
    let movies_to_process = {}
    let keys = Object.keys(this.props.movies)
    for (let i=0; i < keys.length; i++) {
      const movie_url = keys[i]
      const rule_id = this.props.current_telemetry_rule_id
      if (Object.keys(this.props.tier_1_matches['telemetry'][rule_id]['movies']).includes(movie_url)) {
        const offset = this.props.tier_1_matches['telemetry'][rule_id]['movies'][movie_url][0]
        const movie = this.props.movies[movie_url]
        const first_frame = movie['frames'][offset]
        const first_frame_hash = this.props.getFramesetHashForImageUrl(first_frame, movie['framesets'])
        const frameset_hashes = this.props.getFramesetHashesInOrder(movie['framesets'])
        const first_frame_offset = frameset_hashes.indexOf(first_frame_hash)
        const hashes_to_use = frameset_hashes.slice(first_frame_offset)
        num_frames += hashes_to_use.length
        movies_to_process[movie_url] = movie
      }
    }
    const num_movies_to_process = Object.keys(movies_to_process).length.toString()
    if (num_frames === 0) {
      this.displayInsightsMessage('no telemetry matches, cannot submit a job')
      return
    }
    num_frames = num_frames.toString()
    job_data['app'] = 'analyze'
    job_data['operation'] = 'scan_template_threaded'
    job_data['description'] = 'single template, telemetry match in '+ num_movies_to_process + ' movies, '
    job_data['description'] += '('+num_frames+' framesets)  match - threaded'
    let template = this.props.templates[this.props.current_template_id]
    let template_wrap = {}
    template_wrap[this.props.current_template_id] = template
    job_data['description'] += ': template '+ template['name']
    if (!template['scale'] === '1_1') {
      job_data['description'] += ' - multi scale (' + template['scale'] + ')'
    }
    job_data['request_data']['templates'] = template_wrap
    job_data['request_data']['template_id'] = [this.props.current_template_id]
    job_data['request_data']['movies'] = movies_to_process
    job_data['request_data']['scan_level'] = template['scan_level']
    job_data['request_data']['id'] = this.props.current_template_id
    return job_data
  }

  buildLoadMovieJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_threaded'
    job_data['description'] = 'split and hash threaded: ' + extra_data
    job_data['request_data']['movie_url'] = extra_data
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
    job_data['app'] = 'analyze'
    job_data['operation'] = 'telemetry_find_matching_frames'
    job_data['request_data']['telemetry_data'] = this.props.telemetry_data
    job_data['request_data']['telemetry_rule'] = this.props.telemetry_rules[this.props.current_telemetry_rule_id]
    job_data['request_data']['id'] = this.props.current_telemetry_rule_id
    job_data['request_data']['scan_level'] = 'tier_1' // this is the only thing that makes sense for telemetry
    if (job_type === 'current_movie') {
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
      job_data['description'] = 'telemetry, find matching frames for movie'
      job_data['description'] += ': movie ' + this.props.movie_url
      job_data['description'] += ', rule ' + this.props.telemetry_rules[this.props.current_telemetry_rule_id]['name']
    } else if (job_type === 'all_movies') {
      job_data['request_data']['movies'] = this.props.movies
      job_data['description'] = 'telemetry, find matching frames for all movies'
      job_data['description'] += ': rule ' + this.props.telemetry_rules[this.props.current_telemetry_rule_id]['name']
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

  buildSelectedAreaData(scope, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'selected_area_threaded'
    const cur_selected_area = this.props.selected_area_metas[this.props.current_selected_area_meta_id]
    job_data['request_data']['selected_area_metas'] = {}
    job_data['request_data']['selected_area_metas'][this.props.current_selected_area_meta_id] = cur_selected_area
    job_data['request_data']['id'] = this.props.current_selected_area_meta_id
    job_data['request_data']['scan_level'] = cur_selected_area['scan_level']
    if (scope === 'cur_frame') {
      job_data['description'] = 'get selected area for current frame'
      job_data['request_data']['movies'] = this.buildOneFrameMovieForCurrentInsightsImage()
    } else if (scope === 'cur_movie') {
      job_data['description'] = 'get selected area for current movie'
      job_data['request_data']['movies'] = {}
      job_data['request_data']['movies'][this.props.movie_url] = this.props.movies[this.props.movie_url]
    } else if (scope === 'all_movies') {
      job_data['description'] = 'get selected area for all movies'
      job_data['request_data']['movies'] = this.props.movies
    } else if (scope === 'tier1') {
      const tier_1_scanner_id = extra_data
      const scanner_type = this.getType1ScannerType(tier_1_scanner_id)
      job_data['request_data']['movies'] = this.props.tier_1_matches[scanner_type][tier_1_scanner_id]['movies']
      let build_source_movies = {}
      for (let i=0; i < Object.keys(job_data['request_data']['movies']).length; i++) {
        const movie_url = Object.keys(job_data['request_data']['movies'])[i]
        build_source_movies[movie_url] = this.props.movies[movie_url]
      }
      job_data['request_data']['movies']['source'] = build_source_movies
      job_data['description'] = 'selected area match (' + cur_selected_area['name'] + ') '
      job_data['description'] += 'tier 1 ' + scanner_type + '  ' + tier_1_scanner_id
    } else if (scope === 'movie_set') {
    // TODO deal with this if people are going to use it
    }
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
    }
    if (!this.props.movie_url) {
      this.displayInsightsMessage('no movie loaded, cannot submit a job')
      return
    }
    if (job_string === 'current_template_current_movie') {
      let job_data = this.buildScanTemplateCurTempCurMovJobData('movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_current_frame') {
      let job_data = this.buildScanTemplateCurTempCurMovJobData('frame', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_all_movies') {
      let job_data = this.buildScanTemplateCurTempAllMovJobData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_telemetry_matches') {
      let job_data = this.buildScanTemplateCurTempTelemetryMatchesJobData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'ocr_current_frame') {
      let job_data = this.buildScanOcrMovieJobData('current_frame', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'ocr_current_movie') {
      let job_data = this.buildScanOcrMovieJobData('current_movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'ocr_all_movies') {
      let job_data = this.buildScanOcrMovieJobData('all_movies', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_movie_set') {
      let job_data = this.buildScanTemplateCurTempMovSetJobData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_tier1_template') {
      let job_data = this.buildScanTemplateCurTempTier1JobData('template', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_tier1_ocr') {
      let job_data = this.buildScanTemplateCurTempTier1JobData('ocr', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_template_tier1_selected_area') {
      let job_data = this.buildScanTemplateCurTempTier1JobData('selected_area', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'load_movie') {
      let job_data = this.buildLoadMovieJobData(extra_data)
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
    } else if (job_string === 'current_selected_area_meta_tier1_template') {
      let job_data = this.buildSelectedAreaData('t1_template', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_selected_area_meta_tier1_ocr') {
      let job_data = this.buildSelectedAreaData('t1_ocr', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_selected_are_meta_current_frame') {
      let job_data = this.buildSelectedAreaData('cur_frame', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_selected_area_meta_current_movie') {
      let job_data = this.buildSelectedAreaData('cur_movie', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_selected_area_meta_all_movies') {
      let job_data = this.buildSelectedAreaData('all_movies', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_selected_area_meta_movie_set') {
      let job_data = this.buildSelectedAreaData('movie_set', extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'current_selected_area_meta_tier1') {
      let job_data = this.buildSelectedAreaData('tier1', extra_data)
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
    return false
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
    return false
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
    } else if (the_mode === 'selected_area_minimum_zones_1') {
      the_message = 'Select the upper left corner of the zone'
    } else if (the_mode === 'selected_area_minimum_zones_2') {
      the_message = 'Select the bottom right corner of the zone'
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
    if (this.state.mode === 'add_template_anchor_1') {
      this.doAddTemplateAnchorClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_template_anchor_2') {
      this.state.callbacks['add_template_anchor_2']([x_scaled, y_scaled])
    } else if (this.state.mode === 'selected_area_area_coords_1') {
      this.state.callbacks['selected_area_area_coords_1']([x_scaled, y_scaled])
    } else if (this.state.mode === 'add_template_mask_zone_1') {
      this.doAddTemplateMaskZoneClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_template_mask_zone_2') {
      this.state.callbacks['add_template_mask_zone_2']([x_scaled, y_scaled])
    } else if (this.state.mode === 'scan_ocr_1') {
      this.setState({
        mode: 'scan_ocr_2',
        clicked_coords: [x_scaled, y_scaled],
        insights_message: 'click second corner',
      })
    } else if (this.state.mode === 'scan_ocr_2') {
      this.state.callbacks['scan_ocr_2']([x_scaled, y_scaled])
    } else if (this.state.mode === 'add_annotations_ocr_start') {
      this.doAddAnnotationsOcrStartClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_annotations_ocr_end') {
      this.doAddAnnotationsOcrStartClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_sa_origin_location_1') {
      this.state.callbacks['add_sa_origin_location_1']([x_scaled, y_scaled])
    } else if (this.state.mode === 'selected_area_minimum_zones_1') {
      this.state.callbacks['selected_area_minimum_zones_1']([x_scaled, y_scaled])
    } else if (this.state.mode === 'selected_area_minimum_zones_2') {
      this.state.callbacks['selected_area_minimum_zones_2']([x_scaled, y_scaled])
    }
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
            movie_urls={this.props.campaign_movies}
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
              getCurrentSelectedAreaCenters={this.getCurrentSelectedAreaCenters}
              getCurrentSelectedAreaMinimumZones={this.getCurrentSelectedAreaMinimumZones}
              getCurrentSelectedAreaOriginLocation={this.getCurrentSelectedAreaOriginLocation}
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
