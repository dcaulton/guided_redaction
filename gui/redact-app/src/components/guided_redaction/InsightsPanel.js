import React from 'react'
import {
  getFileNameFromUrl
} from './redact_utils.js'
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
      insights_title: '',
      prev_coords: (0,0),
      clicked_coords: (0,0),
      selected_area_template_anchor: '',
      draggedId: null,
      imageTypeToDisplay: '',
      callbacks: {},
      overlay_image_bytes: '',
    }
    this.tier_1_scanner_types = [
      'selected_area',
      'mesh_match',
      'template',
      'selection_grower',
      'data_sifter',
      'focus_finder',
      't1_filter',
      'ocr'
    ]
    this.tier_1_job_operations = [
      'selected_area_threaded',
      'mesh_match_threaded',
      'template_threaded',
      'selection_grower_threaded',
      'data_sifter_threaded',
      'focus_finder_threaded',
      't1_filter',
      'ocr_threaded'
    ]
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.getTier1ScannerMatches=this.getTier1ScannerMatches.bind(this)
    this.currentImageIsT1ScannerRootImage=this.currentImageIsT1ScannerRootImage.bind(this)
    this.afterPingSuccess=this.afterPingSuccess.bind(this)
    this.afterPingFailure=this.afterPingFailure.bind(this)
    this.afterGetVersionSuccess=this.afterGetVersionSuccess.bind(this)
    this.afterGetVersionFailure=this.afterGetVersionFailure.bind(this)
    this.callPing=this.callPing.bind(this)
    this.callGetVersion=this.callGetVersion.bind(this)
    this.submitInsightsJob=this.submitInsightsJob.bind(this)
    this.setSelectedAreaTemplateAnchor=this.setSelectedAreaTemplateAnchor.bind(this)
    this.displayInsightsMessage=this.displayInsightsMessage.bind(this)
    this.setKeyDownCallback=this.setKeyDownCallback.bind(this)
    this.keyDownCallbacks={}
    this.setDraggedId=this.setDraggedId.bind(this)
    this.loadInsightsJobResults=this.loadInsightsJobResults.bind(this)
    this.afterMovieSplitInsightsJobLoaded=this.afterMovieSplitInsightsJobLoaded.bind(this)
    this.setImageTypeToDisplay=this.setImageTypeToDisplay.bind(this)
    this.addInsightsCallback=this.addInsightsCallback.bind(this)
    this.getCurrentPipelineMatches=this.getCurrentPipelineMatches.bind(this)
    this.getCurrentIntersectMatches=this.getCurrentIntersectMatches.bind(this)
    this.getCurrentSumMatches=this.getCurrentSumMatches.bind(this)
    this.getCurrentAreasToRedact=this.getCurrentAreasToRedact.bind(this)
    this.setScrubberToIndex=this.setScrubberToIndex.bind(this)
    this.runCallbackFunction=this.runCallbackFunction.bind(this)
    this.loadOcrDataIntoMovies=this.loadOcrDataIntoMovies.bind(this)
    this.getTier1MatchHashesForMovie=this.getTier1MatchHashesForMovie.bind(this)
    this.setScrubberToNextTier1Hit=this.setScrubberToNextTier1Hit.bind(this)
    this.afterTier1JobLoaded=this.afterTier1JobLoaded.bind(this)
    this.setScrubberToFirstFrame=this.setScrubberToFirstFrame.bind(this)
    this.afterManualCompileDataSifterLoaded=this.afterManualCompileDataSifterLoaded.bind(this)
  }

  getTier1MatchHashesForMovie(scanner_type, movie_url) {
    let hashes = []
    if (!this.props.current_ids['t1_scanner']) {
      return []
    }
    const current_rule_id = this.props.current_ids['t1_scanner'][scanner_type]
    if (!current_rule_id) {
      return []
    }
    if (!Object.keys(this.props.tier_1_matches).includes(scanner_type)) {
      return []
    }
    if (!Object.keys(this.props.tier_1_matches[scanner_type]).includes(current_rule_id)) {
      return []
    }
    const this_rule_matches = this.props.tier_1_matches[scanner_type][current_rule_id]
    if (!Object.keys(this_rule_matches).includes('movies') ||
        !Object.keys(this_rule_matches['movies']).includes(movie_url) ||
        !this_rule_matches['movies'][movie_url]) {
      return []
    }
    const scanner_matches_for_movie = this_rule_matches['movies'][movie_url]
    const frameset_hashes = Object.keys(scanner_matches_for_movie['framesets'])
    for (let i=0; i < frameset_hashes.length; i++) {
      if (Object.keys(scanner_matches_for_movie['framesets'][frameset_hashes[i]]).length > 0) {
        hashes.push(frameset_hashes[i])
      }
    }
    return hashes
  }

  setScrubberToFirstFrame() {
    setTimeout((() => {this.setScrubberToIndex(0)}), 1000)
  }

  setScrubberToNextTier1Hit(scanner_type, movie_url) {
    if (!movie_url) {
      movie_url = this.props.movie_url
    }
    const scanner_frameset_hashes = this.getTier1MatchHashesForMovie(scanner_type, movie_url)
    let movie = this.props.movies[movie_url]
    const movie_frameset_hashes = this.props.getFramesetHashesInOrder(movie)
    if (this.props.movie_url !== movie_url) {
      this.setCurrentVideo(movie_url)
      let lowest_position = 99999
      let scanner_hash = ''
      let index = 99999
      for (let i=0; i < scanner_frameset_hashes.length; i++) {
        scanner_hash = scanner_frameset_hashes[i]
        index = movie_frameset_hashes.indexOf(scanner_hash)
        if (index < lowest_position) {
          lowest_position = index
        }
      }
      setTimeout((() => {this.setScrubberToIndex(lowest_position)}), 1000)
    } else {
      const cur_hash = this.props.frameset_hash
      const cur_position = movie_frameset_hashes.indexOf(cur_hash)
      const remaining_hashes = movie_frameset_hashes.slice(cur_position+1)
      for (let i=0; i < remaining_hashes.length; i++) {
        if (scanner_frameset_hashes.includes(remaining_hashes[i])) {
          const new_index = cur_position + i + 1
          setTimeout((() => {this.setScrubberToIndex(new_index)}), 1000)
          return
        }
      }
      const first_index = movie_frameset_hashes.indexOf(scanner_frameset_hashes[0])
      setTimeout((() => {this.setScrubberToIndex(first_index)}), 1000)
    }
  }

  getActiveT1ResultsMask() {
    for (let i=0; i < Object.keys(this.props.current_ids['t1_scanner']).length; i++) {
      const scanner_type = Object.keys(this.props.current_ids['t1_scanner'])[i]
      if (!this.props.current_ids['t1_scanner'][scanner_type]) {
        continue
      }
      const scanner_id = this.props.current_ids['t1_scanner'][scanner_type]
      if (!Object.keys(this.props.tier_1_matches[scanner_type]).includes(scanner_id)) {
        continue
      }
      const movie_match_obj = this.props.tier_1_matches[scanner_type][scanner_id]
      if (!Object.keys(movie_match_obj['movies']).includes(this.props.movie_url)) {
        continue
      }
      const frameset_hash = this.props.getFramesetHashesInOrder()[0]
      if (!Object.keys(movie_match_obj['movies'][this.props.movie_url]['framesets']).includes(frameset_hash)) {
        continue
      }
      const fsh_match_obj = movie_match_obj['movies'][this.props.movie_url]['framesets'][frameset_hash]
      for (let j=0; j < Object.keys(fsh_match_obj).length; j++) {
        const single_match_obj = fsh_match_obj[Object.keys(fsh_match_obj)[j]]
        if (Object.keys(single_match_obj).includes('mask')) {
          const mask_bytes = single_match_obj['mask']
          return mask_bytes
        }
      }
    }
  }

  setScrubberToIndex(the_value) {
    document.getElementById('movie_scrubber').value = the_value
    this.scrubberOnChange()
  }

  runCallbackFunction(function_name, vitoparms) {
    if (Object.keys(this.state.callbacks).includes(function_name)) {
      return this.state.callbacks[function_name](vitoparms)
    }
    return []
  }

  getCurrentAreasToRedact() {
    if (!this.props.frameset_hash) {
      return []
    }
    if (!this.props.movies || !this.props.movie_url) {
      return []
    }
    if (!Object.keys(this.props.movies[this.props.movie_url]['framesets']).includes(this.props.frameset_hash)) {
      return []
    }
    const this_frameset = this.props.movies[this.props.movie_url]['framesets'][this.props.frameset_hash]
    if (Object.keys(this_frameset).includes('areas_to_redact')) {
      return this_frameset['areas_to_redact']
    }
    return []
  }

  getCurrentPipelineMatches() {
    return this.getCurrentPseudoTier1Matches('pipeline')
  }

  getCurrentIntersectMatches() {
    return this.getCurrentPseudoTier1NoCurrentIdMatches('intersect')
  }

  getCurrentSumMatches() {
    return this.getCurrentPseudoTier1NoCurrentIdMatches('t1_sum')
  }

  getCurrentPseudoTier1NoCurrentIdMatches(scanner_type) {
    const ks = Object.keys(this.props.tier_1_matches[scanner_type])
    if (ks.length > 0) {
      const cur_matches = this.props.tier_1_matches[scanner_type][ks[0]]  
      if (Object.keys(cur_matches['movies']).includes(this.props.movie_url)) {
        const this_movies_matches = cur_matches['movies'][this.props.movie_url]
        if (Object.keys(this_movies_matches['framesets']).includes(this.props.frameset_hash)) {
          const this_framesets_matches = this_movies_matches['framesets'][this.props.frameset_hash]
          return this_framesets_matches
        }
      }
    }
  }

  getCurrentPseudoTier1Matches(scanner_type) {
    const scanner_id = this.props.current_ids['t1_scanner'][scanner_type]
    if (Object.keys(this.props.tier_1_matches[scanner_type]).includes(scanner_id)) {
      const this_pipeline_matches = this.props.tier_1_matches[scanner_type][scanner_id]  
      if (Object.keys(this_pipeline_matches['movies']).includes(this.props.movie_url)) {
        const this_movies_matches = this_pipeline_matches['movies'][this.props.movie_url]
        if (Object.keys(this_movies_matches['framesets']).includes(this.props.frameset_hash)) {
          const this_framesets_matches = this_movies_matches['framesets'][this.props.frameset_hash]
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

  afterTier1JobLoaded(scanner_type) {
    this.setScrubberToNextTier1Hit(scanner_type)
  }

  afterManualCompileDataSifterLoaded() {
    this.setScrubberToFirstFrame()
    this.runCallbackFunction('ds_load_current_data_sifter')
  }

  loadInsightsJobResults(job_id) {
    const job = this.getJobForId(job_id)
    if ((job && job.app === 'parse' && job.operation === 'split_and_hash_threaded')) {
      this.props.loadJobResults(
        job_id, 
        this.afterMovieSplitInsightsJobLoaded
      )
    } else if ((job && job.app === 'analyze' && job.operation === 'manual_compile_data_sifter')) {
      this.props.loadJobResults(
        job_id, 
        this.afterManualCompileDataSifterLoaded
      )
    } else {
      if (job && this.tier_1_job_operations.includes(job.operation)) {
        const scanner_type = this.getScannerTypeFromJobOperation(job.operation)
        this.props.loadJobResults(
          job_id,
          this.afterTier1JobLoaded(scanner_type)
        ) 
      } else {
        this.props.loadJobResults(job_id) 
      }
    }
  }

  getScannerTypeFromJobOperation(operation) {
    const thr_index = operation.indexOf('_threaded')
    if (thr_index > 0) {
      return operation.substring(0, thr_index)
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
  
  setSelectedAreaTemplateAnchor(the_anchor_id) {
    this.setState({
      selected_area_template_anchor: the_anchor_id,
    })
  }

  makeSourceForPassedT1Output(tier_1_output) {
    let movies_obj = {}
    for (let i=0; i < Object.keys(tier_1_output).length; i++) {
      const movie_url = Object.keys(tier_1_output)[i]
      if (movie_url === 'source') {
        continue
      }
      movies_obj[movie_url] = this.props.movies[movie_url]
    }
    return movies_obj
  }

  buildDataSifterManualCompileJobData(job_string, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'manual_compile_data_sifter'

    const data_sifter_id = this.props.current_ids['t1_scanner']['data_sifter']
    const data_sifter = this.props.tier_1_scanners['data_sifter'][data_sifter_id]
    job_data['request_data']['tier_1_scanners'] = {}
    job_data['request_data']['tier_1_scanners']['data_sifter'] = {}
    job_data['request_data']['tier_1_scanners']['data_sifter'][data_sifter_id] = data_sifter
    job_data['request_data']['id'] = data_sifter_id
    job_data['description'] = 'manual compile of data sifter (' + data_sifter.name + ')'

    job_data['request_data']['movies'] = extra_data['movies']
    return job_data
  }

  buildDataSifterBuildJobData(job_string, extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'build_data_sifter'

    const data_sifter_id = this.props.current_ids['t1_scanner']['data_sifter']
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
      template: 'template_threaded',
      ocr: 'ocr_threaded',
      selected_area: 'selected_area_threaded',
      selection_grower: 'selection_grower_threaded',
      mesh_match: 'mesh_match_threaded',
      data_sifter: 'data_sifter_threaded',
      focus_finder: 'focus_finder_threaded',
      t1_filter: 't1_filter_threaded',
    }
    if (!this.props.current_ids['t1_scanner'][scanner_type]) {
      this.displayInsightsMessage('no ' + scanner_type + ' rule selected, cannot submit a job')
      return
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = scanner_operations[scanner_type] || 'insights_cant_find_operation'
    const cur_scanner_id = this.props.current_ids['t1_scanner'][scanner_type]
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

  loadOcrDataIntoMovies(build_job_data, ocr_job_data) {
    // if we have all source movies, and they're not in source, move them into source
    //  then load the ocr job data alongside any other t1 job data remaining in the non-source movies
    let movies_framesets_to_cover = {}

    for (let i=0; i < Object.keys(build_job_data['movies']['source']).length; i++) {
      const movie_url = Object.keys(build_job_data['movies']['source'])[i]
      let movie = build_job_data['movies']['source'][movie_url]
      movies_framesets_to_cover[movie_url] = []
      for (let j=0; j < Object.keys(movie['framesets']).length; j++) {
        const perly = Object.keys(movie['framesets'])[j]
        movies_framesets_to_cover[movie_url].push(perly)
      }
    }
    for (let i=0; i < Object.keys(movies_framesets_to_cover).length; i++) {
      const movie_url = Object.keys(movies_framesets_to_cover)[i]
      for (let j=0; j < Object.keys(movies_framesets_to_cover[movie_url]).length; j++) {
        const fsh_index = Object.keys(movies_framesets_to_cover[movie_url])[j]
        const frameset_hash = movies_framesets_to_cover[movie_url][fsh_index]
        if (
          Object.keys(ocr_job_data).includes('movies') &&
          Object.keys(ocr_job_data['movies']).includes(movie_url) &&
          Object.keys(ocr_job_data['movies'][movie_url]['framesets']).includes(frameset_hash)
        ) {
          for (let k=0; k < Object.keys(ocr_job_data['movies'][movie_url]['framesets'][frameset_hash]).length; k++) {
            const match_key = Object.keys(ocr_job_data['movies'][movie_url]['framesets'][frameset_hash])[k]
            const match_obj = ocr_job_data['movies'][movie_url]['framesets'][frameset_hash][match_key]
            if (!Object.keys(build_job_data['movies']).includes(movie_url)) {
              build_job_data['movies'][movie_url] = {'framesets': {}}
            }
            if (!Object.keys(build_job_data['movies'][movie_url]['framesets']).includes(frameset_hash)) {
              build_job_data['movies'][movie_url]['framesets'][frameset_hash] = {}
            }
            build_job_data['movies'][movie_url]['framesets'][frameset_hash][match_key] = match_obj
          }
        }
      }
    }
  }

  buildT1MovieData(job_data, scope, extra_data) {
    job_data['request_data']['movies'] = {}
    if (scope.match(/_current_frame$/)) {   
      job_data['description'] += 'for frame '
      job_data['request_data']['movies'] = this.buildOneFrameMovieForCurrentInsightsImage()
    } else if (scope.match(/_current_movie$/)) {   
      const movie_name = getFileNameFromUrl(this.props.movie_url)
      job_data['description'] += 'for movie: ' + movie_name
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
    } else if (scope.match(/_t1_ds$/)) {   
      const the_id = extra_data
      const t1_ds_rule = this.props.tier_1_scanners['data_sifter'][the_id]
      const tier_1_output = this.props.tier_1_matches['data_sifter'][the_id]['movies']
      job_data['description'] += 'on t1 ds results (ds ' + t1_ds_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_ff$/)) {   
      const the_id = extra_data
      const t1_ds_rule = this.props.tier_1_scanners['focus_finder'][the_id]
      const tier_1_output = this.props.tier_1_matches['focus_finder'][the_id]['movies']
      job_data['description'] += 'on t1 ff results (ff ' + t1_ds_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_mesh_match$/)) {   
      const a_id = extra_data
      const t1_a_rule = this.props.tier_1_scanners['mesh_match'][a_id]
      const tier_1_output = this.props.tier_1_matches['mesh_match'][a_id]['movies']
      job_data['description'] += 'on t1 mesh_match results (mm ' + t1_a_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    } else if (scope.match(/_t1_selection_grower$/)) {   
      const a_id = extra_data
      const t1_a_rule = this.props.tier_1_scanners['selection_grower'][a_id]
      const tier_1_output = this.props.tier_1_matches['selection_grower'][a_id]['movies']
      job_data['description'] += 'on t1 selection_grower results (mm ' + t1_a_rule['name'] + ')'
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    }
  }

  buildOneFrameMovieForCurrentInsightsImage() {
    let movies_wrap = {}
    movies_wrap[this.props.movie_url] = {}
    movies_wrap[this.props.movie_url]['framesets'] = {}
    movies_wrap[this.props.movie_url]['framesets'][this.props.frameset_hash] = (
       this.props.movies[this.props.movie_url]['framesets'][this.props.frameset_hash]
    )
    movies_wrap[this.props.movie_url]['frames'] = [this.props.getImageUrl()]
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
      job_data['request_data']['movie_urls'] = extra_data
    } else {
      const movie_name = getFileNameFromUrl(extra_data)
      job_data['description'] = 'split and hash threaded: ' + movie_name
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
    job_data['operation'] = 'redact_t1'

    if (
      this.props.current_ids['redact_rule'] &&
      Object.keys(this.props.redact_rules).includes(this.props.current_ids['redact_rule'])
    ) {
      job_data['request_data']['redact_rule'] = this.props.redact_rules[this.props.current_ids['redact_rule']]
    }

    job_data['request_data']['meta'] = {
      return_type: 'url',
      preserve_working_dir_across_batch: true,
    }
    if (job_type === 'redact_custom') {
      let tier_1_output = {}
      if (extra_data['source_type'] === 'pipeline') {
        tier_1_output = this.props.tier_1_matches['pipeline'][ extra_data['source_id']]['movies']
      } else if (extra_data['source_type'] === 't1_scanner') {
        tier_1_output = this.props.tier_1_matches[extra_data['scanner_type']][ extra_data['source_id']]['movies']
      } 
      job_data['description'] = 't1 redact on ' + extra_data['job_desc']
      job_data['request_data']['movies'] = tier_1_output
      job_data['request_data']['movies']['source'] = this.makeSourceForPassedT1Output(tier_1_output)
    }
    return job_data
  }

  buildRedactedMovieFilename(movie_url='') {
    //TODO this is not friendly to file names with more than one period, or with a slash in them
    // TODO this method is duplicated in MoviePanel
    if (!movie_url) {
      movie_url = this.props.movie_url
    }
    let parts = movie_url.split('/')
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
      job_data['operation'] = 'zip_movie_threaded'
      job_data['request_data']['movies'] = this.props.movies
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

  buildIntersectData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'analyze'
    job_data['operation'] = 'intersect'
    job_data['request_data']['job_ids'] = extra_data['job_ids']
    job_data['description'] = 'intersection of ' + extra_data['job_ids'].length.toString() + ' jobs'
    return job_data
  }

  buildT1SumData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'pipeline'
    job_data['operation'] = 't1_sum'
    job_data['request_data']['job_ids'] = extra_data['job_ids']
    job_data['request_data']['mandatory_job_ids'] = extra_data['mandatory_job_ids']
    job_data['description'] = 't1 sum of ' + extra_data['job_ids'].length.toString() + ' jobs'
    return job_data
  }

  buildT1FilterData(extra_data) {
    let job_data = {
      request_data: {},
    }
console.log('monkey donle8')
    job_data['app'] = 'analyze'
    job_data['operation'] = 't1_filter_threaded'
    job_data['request_data']['job_ids'] = extra_data['job_ids']
    job_data['request_data']['filter_criteria'] = extra_data['filter_criteria']
    job_data['description'] = 't1 filter of ' + extra_data['job_ids'].length.toString() + ' jobs'
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
    } else if (job_string === 'intersect') {
      let job_data = this.buildIntersectData(extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 't1_sum') {
      let job_data = this.buildT1SumData(extra_data)
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

    let is_t1_job = false
    let t1_job_type = ''
    for (let i=0; i < this.tier_1_scanner_types.length; i++) {
      const scanner_type = this.tier_1_scanner_types[i]
      if (job_string.startsWith(scanner_type + '_')) {
        is_t1_job = true
        t1_job_type = scanner_type
        break
      }
    }

    if (is_t1_job) {
      let job_data = this.buildTier1JobData(t1_job_type, job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string.startsWith('data_sifter_build_')) {
      let job_data = this.buildDataSifterBuildJobData(job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string === 'manual_compile_data_sifter') {
      let job_data = this.buildDataSifterManualCompileJobData(job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string.startsWith('redact_')) {
      let job_data = this.buildRedactJobData(job_string, extra_data)
      this.props.submitJob({
        job_data: job_data,
      })
    } else if (job_string.startsWith('zip_')) {
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
  
  currentImageIsT1ScannerRootImage(scanner_type, anchor_names) {
    if (this.props.current_ids['t1_scanner'][scanner_type]) {
      let key = this.props.current_ids['t1_scanner'][scanner_type]
      if (!Object.keys(this.props.tier_1_scanners[scanner_type]).includes(key)) {
        return false
      }
      let scanner = this.props.tier_1_scanners[scanner_type][key]
      for (let i=0; i < anchor_names.length; i++) {
        const anchor_name = anchor_names[i]
        if (!Object.keys(scanner).includes(anchor_name)) {
          return false
        }
        for (let j=0; j < scanner[anchor_name].length; j++) {
          const anchor = scanner[anchor_name][j]
          if (
            Object.keys(anchor).includes('image') && 
            anchor['image'] === this.props.getImageUrl()
          ) {
            return true
          }
        }
      }
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
    } else if (the_mode === 'scan_ocr_2') {
      the_message = 'click second corner'
    } else if (the_mode === 'oma_pick_app') {
      the_message = 'select the app'
    } else if (the_mode === 'selection_grower_add_color_center') {
      the_message = 'specify a point with the color you want'
    } else if (the_mode === 'selection_grower_add_color_zone_1') {
      the_message = 'Select the upper left corner of the zone'
    } else if (the_mode === 'selection_grower_add_color_zone_2') {
      the_message = 'Select the bottom right corner of the zone'
    } else if (the_mode === 'ds_delete_ocr_area_1') {
      the_message = 'Select the upper left corner of the zone'
    } else if (the_mode === 'ds_delete_ocr_area_2') {
      the_message = 'click second corner'
    } else if (the_mode === 'ds_add_item_1') {
      the_message = 'Select the upper left corner of the item'
    } else if (the_mode === 'ds_add_item_2') {
      the_message = 'click second corner'
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
      this.props.setFramesetHash(new_frameset_hash, framesets)
    }
  }
  
  displayInsightsMessage(the_message) {
    this.props.setGlobalStateVar('message', the_message)
  }

  movieSplitDone(new_movie) {
    const len = Object.keys(new_movie['framesets']).length
    document.getElementById('movie_scrubber').max = len-1
    this.props.setGlobalStateVar('message', '')
  }

  setCurrentVideo(video_url) {
    const new_movie = this.props.movies[video_url]
    this.props.setActiveMovieFirstFrame(video_url, '', this.movieSplitDone(new_movie))
    document.getElementById('movie_scrubber').value = 0
  }

  handleImageClick = (e) => {
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    const scale = this.props.image_scale
    const x_scaled = parseInt(x / scale)
    const y_scaled = parseInt(y / scale)
    if (x_scaled > this.props.image_width || y_scaled > this.props.image_height) {
        return
    }
    this.setState({
      clicked_coords: [x_scaled, y_scaled],
    })
    if (Object.keys(this.state.callbacks).includes(this.state.mode)) {
      this.state.callbacks[this.state.mode]([x_scaled, y_scaled])
    }
  }

  getTier1ScannerMatches(scanner_type) {
    if (!this.props.frameset_hash) {
      return
    }
    const current_scanner_id = this.props.current_ids['t1_scanner'][scanner_type]
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
    if (!Object.keys(cur_movies_matches['framesets']).includes(this.props.frameset_hash)) {
      return
    }
    return cur_movies_matches['framesets'][this.props.frameset_hash]
  }

  getScrubberHeight() {
    let bottom_y = 100
    if (this.props.frameset_hash) {
      if (document.getElementById('insights_image_div')) {
        bottom_y += document.getElementById('insights_image_div').offsetHeight
      }
    } else if (this.props.movie_url) {
      bottom_y += 385
    }
    return bottom_y
  }

  buildImageElement(insights_image) {
    if (insights_image) {
      const outer_style = {
        position: 'relative',
      }
      const source_img_style = {
        width: '100%',
      }
      let overlay_image_element = ''
      let mask_bytes = this.getActiveT1ResultsMask()
      if (mask_bytes) {
        const the_src = "data:image/gif;base64," + mask_bytes
        const overlay_img_style = {
          width: '100%',
          opacity: .4,
          position: 'absolute',
          top: 0,
          left: 0,
        }
        overlay_image_element = (
          <img 
              id='insights_overlay_image' 
              src={the_src}
              alt='whatever, just an alt tag'
              style={overlay_img_style}
          />
        )
      }
      return (
        <div
          style={outer_style}
        >
          <img 
              id='insights_image' 
              src={insights_image}
              alt={insights_image}
              style={source_img_style}
          />
          {overlay_image_element}
        </div>
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
    let workbook_name = this.props.current_workbook_name
    const insights_image = this.props.getImageUrl()
    const image_element = this.buildImageElement(insights_image)
    const scrubber_div = this.buildScrubberDiv(insights_image)
    let insights_title = this.state.insights_title
    if (!insights_title && ! this.props.movie_url) {
      insights_title = 'load a movie or job to get started'
    }
    if (!this.props.current_workbook_id) {
      workbook_name += ' (unsaved)'
    }
    let the_message = this.props.message
    let message_style = {}
    if (!the_message || the_message === '.') {
      the_message = '.'
      message_style['color'] = 'white'
    }
    let top_white_div_class = 'container'
    let videos_col_class = 'col-lg-2'
    let center_col_class = 'col-lg-7 ml-4'
    let jobs_col_class = 'col-lg-2 ml-4'
    if (!this.props.visibilityFlags['side_nav']) {
      top_white_div_class = 'col'
      videos_col_class = 'col-lg-1'
      center_col_class = 'col-lg-10 p-4'
      jobs_col_class = 'col-lg-1 p-4'
    }
    return (
    <div className={top_white_div_class}>
      <div id='insights_panel' className='row mt-5'>
        <div id='insights_left' className={videos_col_class}>
          <MovieCardList 
            setCurrentVideo={this.setCurrentVideo}
            movie_url={this.props.movie_url}
            campaign_movies={this.props.campaign_movies}
            movies={this.props.movies}
            submitInsightsJob={this.submitInsightsJob}
            setMovieNickname={this.props.setMovieNickname}
            setDraggedId={this.setDraggedId}
            tier_1_matches={this.props.tier_1_matches}
            current_ids={this.props.current_ids}
            getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
            getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
            setScrubberToIndex={this.setScrubberToIndex}
            insights_image={insights_image}
            setGlobalStateVar={this.props.setGlobalStateVar}
            displayInsightsMessage={this.displayInsightsMessage}
            setScrubberToNextTier1Hit={this.setScrubberToNextTier1Hit}
            getTier1MatchHashesForMovie={this.getTier1MatchHashesForMovie}
            toggleHideScannerResults={this.props.toggleHideScannerResults}
            visibilityFlags={this.props.visibilityFlags}
          />
        </div>

        <div id='insights_middle' className={center_col_class}>
          <div 
              className='row'
              id='insights_header'
          >
            <div className='col'>
              <div className='row' id='insights_workbook'>
                <h4>{workbook_name}</h4>
              </div>
              <div className='row' id='insights_title'>
                {insights_title}
              </div>
              <div className='row' id='insights_image_name'>
                {insights_image}
              </div>
              <div className='row' id='message' style={message_style}>
                {the_message}
              </div>
            </div>
          </div>

          <div 
              id='insights_image_div' 
              className='row'
          >
            {image_element}
            <CanvasInsightsOverlay 
              width={this.props.image_width}
              height={this.props.image_height}
              clickCallback={this.handleImageClick}
              currentImageIsT1ScannerRootImage={this.currentImageIsT1ScannerRootImage}
              insights_image_scale={this.props.image_scale}
              getTier1ScannerMatches={this.getTier1ScannerMatches}
              mode={this.state.mode}
              clicked_coords={this.state.clicked_coords}
              getCurrentAreasToRedact={this.getCurrentAreasToRedact}
              movie_url={this.props.movie_url}
              runCallbackFunction={this.runCallbackFunction}
              getCurrentPipelineMatches={this.getCurrentPipelineMatches}
              getCurrentIntersectMatches={this.getCurrentIntersectMatches}
              getCurrentSumMatches={this.getCurrentSumMatches}
              visibilityFlags={this.props.visibilityFlags}
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
            current_workbook_name={this.props.current_workbook_name}
            current_workbook_id={this.props.current_workbook_id}
            workbooks={this.props.workbooks}
            loadWorkbook={this.props.loadWorkbook}
            deleteWorkbook={this.props.deleteWorkbook}
            displayInsightsMessage={this.displayInsightsMessage}
            setKeyDownCallback={this.setKeyDownCallback}
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
            saveScannerToDatabase={this.props.saveScannerToDatabase}
            scanners={this.props.scanners}
            getScanners={this.props.getScanners}
            deleteScanner={this.props.deleteScanner}
            importScanner={this.props.importScanner}
            importRedactRule={this.props.importRedactRule}
            preserve_movie_audio={this.props.preserve_movie_audio}
            pipelines={this.props.pipelines}
            getPipelines={this.props.getPipelines}
            dispatchPipeline={this.props.dispatchPipeline}
            deletePipeline={this.props.deletePipeline}
            savePipelineToDatabase={this.props.savePipelineToDatabase}
            jobs={this.props.jobs}
            results={this.props.results}
            app_codebooks={this.props.app_codebooks}
            tier_1_scanners={this.props.tier_1_scanners}
            redact_rules={this.props.redact_rules}
            current_ids={this.props.current_ids}
            impersonateUser={this.props.impersonateUser}
            cv_workers={this.props.cv_workers}
            queryCvWorker={this.props.queryCvWorker}
            dispatchFetchSplitAndHash={this.props.dispatchFetchSplitAndHash}
            deleteOldJobs={this.props.deleteOldJobs}
            job_polling_interval_seconds={this.props.job_polling_interval_seconds}
            getJobResultData={this.props.getJobResultData}
            runExportTask={this.props.runExportTask}
            postImportArchiveCall={this.props.postImportArchiveCall}
            getColorAtPixel={this.props.getColorAtPixel}
            getColorsInZone={this.props.getColorsInZone}
            detectScreens={this.props.detectScreens}
            loadInsightsJobResults={this.loadInsightsJobResults}
            mode={this.state.mode}
            job_lifecycle_data={this.props.job_lifecycle_data}
            establishNewEmptyMovie={this.props.establishNewEmptyMovie}
            addImageToMovie={this.props.addImageToMovie}
            postMakeUrlCall={this.props.postMakeUrlCall}
            urlReturnsOk={this.props.urlReturnsOk}
          />
        </div>

        <div id='insights_right' className={jobs_col_class}>
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
            setScrubberToNextTier1Hit={this.setScrubberToNextTier1Hit}
          />
        </div>
      </div>
    </div>
    )
  }
}

export default InsightsPanel;
