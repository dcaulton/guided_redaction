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
      campaign_movies: [
        'http://localhost:3000/images/0d0b8fd4-75cb-4793-8740-ec78e46d06da.mp4',
        'http://localhost:3000/images/c708e978-0c4c-493c-a4e7-553a8ac78aa5.mp4',
        'http://localhost:3000/images/d448ccd5-79b4-4157-8fa1-d9504b2bdf08.mp4',
      ],
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
      showTemplates: true,
      showSelectedArea: true,
      showAnnotate: true,
      showTelemetry: true,
      showOcr: true,
      showMovieSets: true,
      showResults: true,
      showDiffs: true,
      imageTypeToDisplay: '',
    }
    this.getSelectedAreas=this.getSelectedAreas.bind(this)
    this.getAnnotations=this.getAnnotations.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.clearCurrentTemplateAnchor=this.clearCurrentTemplateAnchor.bind(this)
    this.clearCurrentTemplateMaskZones=this.clearCurrentTemplateMaskZones.bind(this)
    this.getTemplateMatches=this.getTemplateMatches.bind(this)
    this.clearTemplateMatches=this.clearTemplateMatches.bind(this)
    this.clearSelectedAreas=this.clearSelectedAreas.bind(this)
    this.getMovieMatchesFound=this.getMovieMatchesFound.bind(this)
    this.getMovieDiffsFound=this.getMovieDiffsFound.bind(this)
    this.getMovieSelectedCount=this.getMovieSelectedCount.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.afterArrowFill=this.afterArrowFill.bind(this)
    this.afterPingSuccess=this.afterPingSuccess.bind(this)
    this.afterPingFailure=this.afterPingFailure.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.getCurrentTemplateAnchorNames=this.getCurrentTemplateAnchorNames.bind(this)
    this.callPing=this.callPing.bind(this)
    this.submitInsightsJob=this.submitInsightsJob.bind(this)
    this.setSelectedAreaTemplateAnchor=this.setSelectedAreaTemplateAnchor.bind(this)
    this.getCurrentSelectedAreaMeta=this.getCurrentSelectedAreaMeta.bind(this)
    this.displayInsightsMessage=this.displayInsightsMessage.bind(this)
    this.saveTemplate=this.saveTemplate.bind(this)
    this.saveAnnotation=this.saveAnnotation.bind(this)
    this.deleteTemplate=this.deleteTemplate.bind(this)
    this.deleteAnnotation=this.deleteAnnotation.bind(this)
    this.handleKeyDown=this.handleKeyDown.bind(this)
    this.setKeyDownCallback=this.setKeyDownCallback.bind(this)
    this.keyDownCallbacks = {}
    this.setDraggedId=this.setDraggedId.bind(this)
    this.toggleShowTemplates=this.toggleShowTemplates.bind(this)
    this.toggleShowSelectedArea=this.toggleShowSelectedArea.bind(this)
    this.toggleShowMovieSets=this.toggleShowMovieSets.bind(this)
    this.toggleShowResults=this.toggleShowResults.bind(this)
    this.toggleShowAnnotate=this.toggleShowAnnotate.bind(this)
    this.toggleShowTelemetry=this.toggleShowTelemetry.bind(this)
    this.toggleShowOcr=this.toggleShowOcr.bind(this)
    this.toggleShowDiffs=this.toggleShowDiffs.bind(this)
    this.loadInsightsJobResults=this.loadInsightsJobResults.bind(this)
    this.afterMovieSplitInsightsJobLoaded=this.afterMovieSplitInsightsJobLoaded.bind(this)
    this.setCampaignMovies=this.setCampaignMovies.bind(this)
    this.blinkDiff=this.blinkDiff.bind(this)
    this.setImageTypeToDisplay=this.setImageTypeToDisplay.bind(this)
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

  setCampaignMovies(the_url_string) {
    const movies = the_url_string.split('\n')
    this.setState({
      campaign_movies: movies,
    })
  }

  loadInsightsJobResults(job_id) {
    const job = this.getJobForId(job_id)
    if (job.app === 'parse' && job.operation === 'split_and_hash_movie') {
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

  toggleShowTemplates() {
    const new_value = (!this.state.showTemplates)
    this.setState({
      showTemplates: new_value,
    })
  }

  toggleShowSelectedArea() {
    const new_value = (!this.state.showSelectedArea)
    this.setState({
      showSelectedArea: new_value,
    })
  }

  toggleShowMovieSets() {
    const new_value = (!this.state.showMovieSets)
    this.setState({
      showMovieSets: new_value,
    })
  }

  toggleShowResults() {
    const new_value = (!this.state.showResults)
    this.setState({
      showResults: new_value,
    })
  }

  toggleShowAnnotate() {
    const new_value = (!this.state.showAnnotate)
    this.setState({
      showAnnotate: new_value,
    })
  }

  toggleShowTelemetry() {
    const new_value = (!this.state.showTelemetry)
    this.setState({
      showTelemetry: new_value,
    })
  }

  toggleShowOcr() {
    const new_value = (!this.state.showOcr)
    this.setState({
      showOcr: new_value,
    })
  }

  toggleShowDiffs() {
    const new_value = (!this.state.showDiffs)
    this.setState({
      showDiffs: new_value,
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
    job_data['operation'] = 'scan_template'
    job_data['description'] = 'single template '+ num_movies+ ' movies, ('+num_frames+' framesets)  match'
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
    job_data['operation'] = 'scan_template'
    let template = this.props.templates[this.props.current_template_id]
    job_data['description'] = 'single template (' + template['name'] + ') '+ num_movies+ ' movies (from MovieSet ' + movie_set_name + '), match'
    job_data['request_data']['template'] = template
    job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
    job_data['request_data']['target_movies'] = movies_to_run
    job_data['request_data']['movie_set_movies'] = this.props.movie_sets[extra_data]
    return job_data
  }

  buildLoadMovieJobData(extra_data) {
    let job_data = {
      request_data: {},
    }
    job_data['app'] = 'parse'
    job_data['operation'] = 'split_and_hash_movie'
    job_data['description'] = 'load and hash movie: ' + extra_data
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

  submitInsightsJob(job_string, extra_data) {
    if (job_string === 'current_template_current_movie') {
      let job_data = this.buildScanTemplateCurTempCurMovJobData(extra_data)
      this.props.submitJob(job_data)
    } else if (job_string === 'current_template_all_movies') {
      let job_data = this.buildScanTemplateCurTempAllMovJobData(extra_data)
      this.props.submitJob(job_data)
    } else if (job_string === 'current_template_movie_set') {
      let job_data = this.buildScanTemplateCurTempMovSetJobData(extra_data)
      this.props.submitJob(job_data)
    } else if (job_string === 'load_movie') {
      let job_data = this.buildLoadMovieJobData(extra_data)
      this.props.submitJob(job_data)
    } else if (job_string === 'diffs_current_movie') {
      let job_data = this.buildCalcDiffsData('current_movie', extra_data)
      this.props.submitJob(job_data)
    } else if (job_string === 'diffs_all_movies') {
      let job_data = this.buildCalcDiffsData('all_movies', extra_data)
      this.props.submitJob(job_data)
    }
  }

  
  getCurrentTemplateMaskZones() {
    if (Object.keys(this.props.templates).includes(this.props.current_template_id)) {
      return this.props.templates[this.props.current_template_id]['mask_zones']
    } else {
      return []
    }
  }

  getCurrentTemplateAnchorNames() {
    if (Object.keys(this.props.templates).includes(this.props.current_template_id)) {
      let cur_template = this.props.templates[this.props.current_template_id]
      let return_arr = []
      for (let i=0; i < Object.keys(cur_template['anchors']).length; i++) {
        const anchor = cur_template['anchors'][i]
        return_arr.push(anchor['id'])
      }
      return return_arr
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
    const keys = Object.keys(framesets)
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
  
  clearCurrentTemplateAnchor() {
  // This currently clears all anchors.  Update it to take coords to remove just one anchor
    if (!this.props.templates || Object.keys(this.props.templates).length === 0) {
      return
    }
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    let cur_template = deepCopyTemplates[this.props.current_template_id]
    cur_template['anchors'] =[]
    deepCopyTemplates[this.props.current_template_id] = cur_template
    this.props.setTemplates(deepCopyTemplates)
    this.displayInsightsMessage('Anchor has been cleared')
  }

  displayInsightsMessage(the_message) {
    this.setState({
      insights_message: the_message
    })
  }

  clearCurrentTemplateMaskZones() {
    if (!this.props.templates || Object.keys(this.props.templates).length === 0) {
      return
    }
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    let cur_template = deepCopyTemplates[this.props.current_template_id]
    cur_template['mask_zones'] =[]
    deepCopyTemplates[this.props.current_template_id] = cur_template
    this.props.setTemplates(deepCopyTemplates)
    this.displayInsightsMessage('Mask zones have been cleared')
  }

  clearTemplateMatches(scope) {
    if (scope === 'all_templates') {
      this.props.clearTemplateMatches()
    } else if (scope === 'all_movies') {
      this.props.setTemplateMatches(this.props.current_template_id, {})
    } else if (scope === 'movie') {
      const template_matches = this.props.getCurrentTemplateMatches()
      let deepCopy = JSON.parse(JSON.stringify(
        template_matches[this.props.current_template_id])
      )
      if (Object.keys(deepCopy).includes(this.props.movie_url)) {
        delete deepCopy[this.props.movie_url]
        this.props.setTemplateMatches(this.props.current_template_id, deepCopy)
      }
    }
    this.displayInsightsMessage('Template matches have been cleared')
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
    const first_key = Object.keys(new_framesets)[0]
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
      this.addCurrentTemplateAnchor(scale, x_scaled, y_scaled)
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
      this.addCurrentTemplateMaskZone(scale, x_scaled, y_scaled)
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

  saveTemplate(template_data, when_done=(()=>{}), anchors=[], mask_zones=[]) {
    if (!template_data['id']) {
      template_data['id'] = 'template_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    }
    if (Object.keys(this.props.templates).includes(template_data['id'])) {
      // get anchors and match_zones from the global object, all other props comes from the TemplateControls
      template_data['anchors'] = this.props.templates[template_data['id']]['anchors']
      template_data['mask_zones'] = this.props.templates[template_data['id']]['mask_zones']
    } else {
      template_data['anchors'] = []
      template_data['mask_zones'] = []
    }
    if (anchors.length) {
      template_data['anchors'] = anchors
    }
    if (mask_zones.length) {
      template_data['mask_zones'] = mask_zones
    }
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    deepCopyTemplates[template_data['id']] = template_data
    this.props.setTemplates(deepCopyTemplates)
    this.props.setCurrentTemplateId(template_data['id'])
    when_done()
  }

  deleteTemplate(template_id, when_done=(()=>{})) {
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    delete deepCopyTemplates[template_id]
    this.props.setTemplates(deepCopyTemplates)
    if (template_id === this.props.current_template_id) {
      this.props.setCurrentTemplateId('')
    }
    when_done()
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

  addCurrentTemplateAnchor(scale, x_scaled, y_scaled) {
    const anchor_id = 'anchor_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_anchor = {
        'id': anchor_id,
        'start': this.state.clicked_coords, 
        'end': [x_scaled, y_scaled],
        'image': this.state.insights_image,
        'movie': this.props.movie_url,
    }

    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    let cur_template = deepCopyTemplates[this.props.current_template_id]
    cur_template['anchors'].push(the_anchor)
    deepCopyTemplates[this.props.current_template_id] = cur_template
    this.props.setTemplates(deepCopyTemplates)

    this.setState({
      insights_image_scale: scale,
      prev_coords: this.state.clicked_coords,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'Anchor has been added',
      mode: 'add_template_anchor_3',
    })
  }

  addCurrentTemplateMaskZone(scale, x_scaled, y_scaled) {
    const mask_zone_id = 'mask_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_mask_zone = {
        'id': mask_zone_id,
        'start': this.state.clicked_coords, 
        'end': [x_scaled, y_scaled],
        'image': this.state.insights_image,
        'movie': this.props.movie_url,
    }

    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    let cur_template = deepCopyTemplates[this.props.current_template_id]
    cur_template['mask_zones'].push(the_mask_zone)
    deepCopyTemplates[this.props.current_template_id] = cur_template
    this.props.setTemplates(deepCopyTemplates)

    this.setState({
      insights_image_scale: scale,
      prev_coords: this.state.clicked_coords,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'Mask zone has been added',
      mode: 'add_template_mask_zone_3',
    })
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
            movie_urls={this.state.campaign_movies}
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
            clearCurrentTemplateAnchor={this.clearCurrentTemplateAnchor}
            clearCurrentTemplateMaskZones={this.clearCurrentTemplateMaskZones}
            getCurrentTemplateAnchorNames={this.getCurrentTemplateAnchorNames}
            clearTemplateMatches={this.clearTemplateMatches}
            clearSelectedAreas={this.clearSelectedAreas}
            clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
            insights_image={this.state.insights_image}
            callPing={this.callPing}
            templates={this.props.templates}
            submitInsightsJob={this.submitInsightsJob}
            saveWorkbook={this.props.saveWorkbook}
            saveWorkbookName={this.props.saveWorkbookName}
            setSelectedAreaTemplateAnchor={this.setSelectedAreaTemplateAnchor}
            getCurrentSelectedAreaMeta={this.getCurrentSelectedAreaMeta}
            current_workbook_name={this.props.current_workbook_name}
            workbooks={this.props.workbooks}
            loadWorkbook={this.props.loadWorkbook}
            deleteWorkbook={this.props.deleteWorkbook}
            current_template_id={this.props.current_template_id}
            displayInsightsMessage={this.displayInsightsMessage}
            setCurrentTemplateId={this.props.setCurrentTemplateId}
            saveTemplate={this.saveTemplate}
            deleteTemplate={this.deleteTemplate}
            saveAnnotation={this.saveAnnotation}
            deleteAnnotation={this.deleteAnnotation}
            annotations={this.props.annotations}
            setKeyDownCallback={this.setKeyDownCallback}
            getAnnotations={this.getAnnotations}
            cropImage={this.props.cropImage}
            movie_sets={this.props.movie_sets}
            setMovieSets={this.props.setMovieSets}
            draggedId={this.state.draggedId}
            showTemplates={this.state.showTemplates}
            showSelectedArea={this.state.showSelectedArea}
            showMovieSets={this.state.showMovieSets}
            showResults={this.state.showResults}
            showAnnotate={this.state.showAnnotate}
            showTelemetry={this.state.showTelemetry}
            showOcr={this.state.showOcr}
            showDiffs={this.state.showDiffs}
            playSound={this.props.playSound}
            togglePlaySound={this.props.togglePlaySound}
            toggleShowTemplates={this.toggleShowTemplates}
            toggleShowSelectedArea={this.toggleShowSelectedArea}
            toggleShowMovieSets={this.toggleShowMovieSets}
            toggleShowResults={this.toggleShowResults}
            toggleShowAnnotate={this.toggleShowAnnotate}
            toggleShowTelemetry={this.toggleShowTelemetry}
            toggleShowOcr={this.toggleShowOcr}
            toggleShowDiffs={this.toggleShowDiffs}
            setFramesetDiscriminator={this.props.setFramesetDiscriminator}
            campaign_movies={this.state.campaign_movies}
            setCampaignMovies={this.setCampaignMovies}
            updateGlobalState={this.props.updateGlobalState}
            blinkDiff={this.blinkDiff}
            setImageTypeToDisplay={this.setImageTypeToDisplay}
            imageTypeToDisplay={this.state.imageTypeToDisplay}
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
