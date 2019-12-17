import React from 'react'
import CanvasInsightsOverlay from './CanvasInsightsOverlay'
import BottomInsightsControls from './BottomInsightsControls'

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
      image_width: 100,
      image_height: 100,
      insights_image_scale: 1,
      insights_title: 'Insights, load a movie to get started',
      insights_message: '',
      prev_coords: (0,0),
      clicked_coords: (0,0),
      selected_area_template_anchor: '',
    }
    this.getSelectedAreas=this.getSelectedAreas.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.clearCurrentTemplateAnchor=this.clearCurrentTemplateAnchor.bind(this)
    this.clearCurrentTemplateMaskZones=this.clearCurrentTemplateMaskZones.bind(this)
    this.scanTemplate=this.scanTemplate.bind(this)
    this.getTemplateMatches=this.getTemplateMatches.bind(this)
    this.clearTemplateMatches=this.clearTemplateMatches.bind(this)
    this.clearSelectedAreas=this.clearSelectedAreas.bind(this)
    this.getMovieMatchesFound=this.getMovieMatchesFound.bind(this)
    this.getMovieSelectedCount=this.getMovieSelectedCount.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.afterArrowFill=this.afterArrowFill.bind(this)
    this.afterPingSuccess=this.afterPingSuccess.bind(this)
    this.afterPingFailure=this.afterPingFailure.bind(this)
    this.getCurrentTemplateMaskZones=this.getCurrentTemplateMaskZones.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
    this.callPing=this.callPing.bind(this)
    this.loadJobResults=this.loadJobResults.bind(this)
    this.submitInsightsJob=this.submitInsightsJob.bind(this)
    this.setSelectedAreaTemplateAnchor=this.setSelectedAreaTemplateAnchor.bind(this)
    this.getCurrentSelectedAreaMeta=this.getCurrentSelectedAreaMeta.bind(this)
  }

  componentDidMount() {
    this.props.getJobs()
    this.props.getWorkbooks()
  }

  getCurrentSelectedAreaMeta() {
    if (this.props.current_selected_area_meta_id && 
        Object.keys(this.props.selected_area_metas).includes(this.props.current_selected_area_meta_id)) {
      return this.props.selected_area_metas[this.props.current_selected_area_meta_id]
    }
    return {}
  }

  setSelectedAreaTemplateAnchor(the_anchor_id) {
    this.setState({
      selected_area_template_anchor: the_anchor_id,
    })
  }

  submitInsightsJob(job_string, extra_data) {
    let job_data = {
      request_data: {},
    }
    if (job_string === 'current_template_current_movie') {
      job_data['app'] = 'analyze'
      job_data['operation'] = 'scan_template'
      job_data['description'] = 'single template single movie match'
      if (Object.keys(this.props.templates).length > 1) {
        const num_temps = Object.keys(this.props.templates).length.toString()
        job_data['description'] = num_temps + ' templates single movie match'
      }
      for (let i=0; i < Object.keys(this.props.templates).length; i++) {
        let template_key = Object.keys(this.props.templates)[i]
        let template = this.props.templates[template_key]
        job_data['request_data']['template'] = template
        job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
        job_data['request_data']['template_id'] = template['id']
        const wrap = {}
        wrap[this.props.movie_url] = this.props.movies[this.props.movie_url]
        job_data['request_data']['target_movies'] = wrap
        this.props.submitJob(job_data)
      }
    } else if (job_string === 'current_template_all_movies') {
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
      if (Object.keys(this.props.templates).length > 1) {
        const num_temps = Object.keys(this.props.templates).length.toString()
        job_data['description'] = num_temps + ' templates '+ num_movies+ ' movies, ('+num_frames+' framesets)  match'
      } else {
        job_data['description'] = 'single template '+ num_movies+ ' movies, ('+num_frames+' framesets)  match'
      }
      for (let i=0; i < Object.keys(this.props.templates).length; i++) {
        let template_key = Object.keys(this.props.templates)[i]
        let template = this.props.templates[template_key]
        job_data['request_data']['template'] = template
        job_data['request_data']['source_image_url'] = template['anchors'][0]['image']
        job_data['request_data']['target_movies'] = this.props.movies
        this.props.submitJob(job_data)
      }
    } else if (job_string === 'load_movie') {
      job_data['app'] = 'parse'
      job_data['operation'] = 'split_and_hash_movie'
      job_data['description'] = 'load and hash movie: ' + extra_data
      job_data['request_data']['movie_url'] = extra_data
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

  getCurrentTemplateAnchors() {
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

  scanTemplate(scope) {
    if (scope === 'all_movies') {
      this.props.callTemplateScanner(this.props.current_template_id, this.state.insights_image, this.props.movies)
    } else if (scope === 'movie') {
      const the_movie = this.props.movies[this.props.movie_url]
      const wrap = {}
      wrap[this.props.movie_url] = the_movie
      this.props.callTemplateScanner(this.props.current_template_id, this.state.insights_image, wrap)
    } else if (scope === 'image') {
      this.props.callTemplateScanner(this.props.current_template_id, this.state.insights_image, [], this.props.insights_image)
    }
  }

  getMovieMatchesFound(movie_url) {
    let message = '0 images matched any anchor'
    if (!Object.keys(this.props.template_matches).includes(this.props.current_template_id)) {
      return message
    }
    const cur_templates_matches = this.props.template_matches[this.props.current_template_id]
    if (!Object.keys(cur_templates_matches).includes(movie_url)) {
      return message 
    }
    const cur_movies_matches = cur_templates_matches[movie_url]
    let count = Object.keys(cur_movies_matches).length
    return count.toString() + ' images matched any anchor'
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
      this.setState({
        insights_message: 'ping succeeded',
      })
    } else {
      this.setState({
        insights_message: 'unexpected ping response, could be failure',
      })
    }
  }

  afterPingFailure(error) {
    console.error(error);
    this.setState({
      insights_message: 'ping failed',
    })
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
    }
    this.setState({
      mode: the_mode,
      insights_message: the_message,
    })
  }

  scrubberOnChange() {
    const value = document.getElementById('movie_scrubber').value
    const keys = Object.keys(this.props.framesets)
    const new_frameset_hash = keys[value]
    const the_url = this.props.framesets[new_frameset_hash]['images'][0]
    this.setState({
      insights_image: the_url,
      insights_title: the_url,
    }, this.setImageSize)
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
    this.setState({
      insights_message: 'Anchor has been cleared'
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
    this.setState({
      insights_message: 'Mask zones have been cleared'
    })
  }

  clearTemplateMatches(scope) {
    if (scope === 'all_templates') {
      this.props.clearTemplateMatches()
    } else if (scope === 'all_movies') {
      this.props.setTemplateMatches(this.props.current_template_id, {})
    } else if (scope === 'movie') {
      let deepCopy = JSON.parse(JSON.stringify(this.props.template_matches[this.props.current_template_id]))
      if (Object.keys(deepCopy).includes(this.props.movie_url)) {
        delete deepCopy[this.props.movie_url]
        this.props.setTemplateMatches(this.props.current_template_id, deepCopy)
      }
    }
    this.setState({
      insights_message: 'Template matches have been cleared'
    })
  }

  clearSelectedAreas() {
    const cur_hash = this.getScrubberFramesetHash() 
    this.props.setSelectedArea([], this.state.insights_image, this.props.movie_url, cur_hash)
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
    this.props.doMovieSplit(video_url, this.movieSplitDone)
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
      this.props.doFloodFill(x_scaled, y_scaled, this.state.insights_image, selected_areas, scrubber_frameset_hash, sam_id)
    } else if (this.state.mode === 'arrow_fill_1') {
      this.setState({
        insights_image_scale: scale,
        clicked_coords: [x_scaled, y_scaled],
        insights_message: 'Calling arrow fill api',
      })
      const sam_id = this.getSelectAreaMetaId('arrow', x_scaled, y_scaled)
      this.props.doArrowFill(x_scaled, y_scaled, this.state.insights_image, selected_areas, scrubber_frameset_hash, sam_id, this.afterArrowFill)
    } else if (this.state.mode === 'add_template_mask_zone_1') {
      this.doAddTemplateMaskZoneClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_template_mask_zone_2') {
      this.addCurrentTemplateMaskZone(scale, x_scaled, y_scaled)
    }
  }

  afterArrowFill() {
    this.setState({
      insights_message: 'Fill area added, click to add another.',
    })
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

  createTemplateSkeleton() {
    const template_id = 'template_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let the_template = {
      'id': template_id,
      'name': template_id,
      'anchors': [],
      'mask_zones': [],
    }
    return the_template
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
    let cur_template = this.createTemplateSkeleton()
    let template_id = cur_template['id']
    if (Object.keys(deepCopyTemplates).includes(this.props.current_template_id)) {
      cur_template = deepCopyTemplates[this.props.current_template_id]
      template_id = cur_template['id']
    } else {
      this.props.setCurrentTemplate(template_id)
    }
    cur_template['anchors'].push(the_anchor)
    deepCopyTemplates[template_id] = cur_template
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
    let cur_template = this.createTemplateSkeleton()
    let template_id = cur_template['id']
    if (Object.keys(deepCopyTemplates).includes(this.props.current_template_id)) {
      cur_template = deepCopyTemplates[this.props.current_template_id]
      template_id = cur_template['id']
    } else {
      this.props.setCurrentTemplate(template_id)
    }
    cur_template['mask_zones'].push(the_mask_zone)
    deepCopyTemplates[template_id] = cur_template
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
    if (this.props.movie_url && Object.keys(this.props.movies).includes(this.props.movie_url)) {
      for (let frameset_hash in this.props.framesets) {
        if (this.props.framesets[frameset_hash]['images'].includes(this.state.insights_image)) {
          return frameset_hash
        }
      }
    }

  }

  getTemplateMatches() {
    if (!Object.keys(this.props.template_matches).includes(this.props.current_template_id)) {
      return
    }
    const cur_templates_matches = this.props.template_matches[this.props.current_template_id]
    if (!Object.keys(cur_templates_matches).includes(this.props.movie_url)) {
      return
    }
    const cur_movies_matches = cur_templates_matches[this.props.movie_url]
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

  loadJobResults(job_id) {
    for (let i=0; i < this.props.jobs.length; i++) {
      if (this.props.jobs[i]['id'] === job_id) {
        const job = this.props.jobs[i]
        const response_data = JSON.parse(job.response_data)
        const request_data = JSON.parse(job.request_data)
        if (job.app === 'analyze' && job.operation === 'scan_template') {
          const template_id = request_data['template']['id']
          this.props.setTemplateMatches(template_id, response_data)
          if (!Object.keys(this.props.templates).includes(template_id)) {
            let deepCopyTemplates= JSON.parse(JSON.stringify(this.props.templates))
            let template = request_data['template']
            deepCopyTemplates[template_id] = template
            this.props.setTemplates(deepCopyTemplates)
            this.props.setCurrentTemplate(template_id)

            const cur_movies = Object.keys(this.props.movies)
            let deepCopyMovies= JSON.parse(JSON.stringify(this.props.movies))
            let movie_add = false
            let movie_url = ''
            for (let j=0; j < Object.keys(request_data['target_movies']).length; j++)  {
              movie_url = Object.keys(request_data['target_movies'])[j]
              if (!cur_movies.includes(movie_url)) {
                deepCopyMovies[movie_url] = request_data['target_movies'][movie_url]
                movie_add = true
              }
            }
            if (movie_add) {
              this.props.addMovieAndSetActive(movie_url, deepCopyMovies, this.movieSplitDone) 
            }
          }
        } else if (job.app === 'parse' && job.operation === 'split_and_hash_movie') {
          let frames = response_data.frames
          let framesets = response_data.unique_frames
          let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
          deepCopyMovies[request_data['movie_url']] = {
            frames: frames,
            framesets: framesets,
          }
          this.props.addMovieAndSetActive(request_data['movie_url'], deepCopyMovies, this.movieSplitDone) 
        }

      }
    }
  }

  render() {
    let workbook_name = this.props.current_workbook_name
    if (!this.props.current_workbook_id) {
      workbook_name += ' (unsaved)'
    }
    let imageDivStyle= {
      width: this.props.image_width,
      height: this.props.image_height,
    }
    let bottom_y = 50
    let the_display='block'
    if (!this.state.insights_image) {
      the_display='none'
    }
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
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
            getMovieSelectedCount={this.getMovieSelectedCount}
            submitInsightsJob={this.submitInsightsJob}
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
            setMode={this.handleSetMode}
            clearCurrentTemplateAnchor={this.clearCurrentTemplateAnchor}
            clearCurrentTemplateMaskZones={this.clearCurrentTemplateMaskZones}
            getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
            scanTemplate={this.scanTemplate}
            clearTemplateMatches={this.clearTemplateMatches}
            clearSelectedAreas={this.clearSelectedAreas}
            clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
            insights_image={this.state.insights_image}
            callPing={this.callPing}
            templates={this.props.templates}
            current_template_id={this.props.current_template_id}
            submitInsightsJob={this.submitInsightsJob}
            getJobs={this.props.getJobs}
            saveWorkbook={this.props.saveWorkbook}
            saveWorkbookName={this.props.saveWorkbookName}
            setSelectedAreaTemplateAnchor={this.setSelectedAreaTemplateAnchor}
            getCurrentSelectedAreaMeta={this.getCurrentSelectedAreaMeta}
            current_workbook_name={this.props.current_workbook_name}
            current_workbook_id={this.props.current_workbook_id}
            workbooks={this.props.workbooks}
            loadWorkbook={this.props.loadWorkbook}
            deleteWorkbook={this.props.deleteWorkbook}
          />
        </div>

        <div id='insights_right' className='col-lg-2 ml-4'>
          <JobCardList 
            jobs={this.props.jobs}
            loadJobResults={this.loadJobResults}
            cancelJob={this.props.cancelJob}
          />
        </div>
      </div>
    );
  }
}

class JobCardList extends React.Component {
  render() {
    return (
      <div>
        <div className='row'>
          <h3>Jobs</h3>
        </div>
      {this.props.jobs.map((value, index) => {
        return (
        <JobCard
          key={index}
          job_data={value}
          loadJobResults={this.props.loadJobResults}
          cancelJob={this.props.cancelJob}
        />
        )
      })}
      </div>
    )
  }
}

class JobCard extends React.Component {
  render() {
    let get_job_button = ''
    if (this.props.job_data['status'] === 'success') {
      get_job_button = (
        <button 
            className='btn btn-primary mt-2 ml-2'
            onClick={() => this.props.loadJobResults(this.props.job_data['id'])}
        >
          Get Results
        </button>
      )
    }
    let delete_job_button = (
      <button 
          className='btn btn-primary mt-2 ml-2'
          onClick={() => this.props.cancelJob(this.props.job_data['id'])}
      >
        Delete
      </button>
    )
    let job_response_data = ''
    if (this.props.job_data['status'] === 'failed') {
      job_response_data = (
        <div className='row mt-1'>
          {this.props.job_data['response_data']}
        </div>
      )
    }
    return (
      <div className='row mt-4 card'>
        <div className='col'>
          <div className='row border-bottom'>
            {this.props.job_data['id']}
          </div>
          <div className='row mt-1'>
            {this.props.job_data['description']}
          </div>
          <div className='row h4'>
            {this.props.job_data['status']}
          </div>
          {job_response_data}
          <div className='row mt-1'>
            {this.props.job_data['created_on']}
          </div>
          <div className='row mt-1'>
            {get_job_button}
            {delete_job_button}
          </div>
        </div>
      </div>
    )
  }
}

class MovieCardList extends React.Component {
  render() {
    return (
      <div>
        <div className='row'>
          <h3>Videos</h3>
        </div>
      {this.props.movie_urls.map((value, index) => {
        return (
        <MovieCard
            key={index}
            setCurrentVideo={this.props.setCurrentVideo}
            active_movie_url={this.props.movie_url}
            this_cards_movie_url={value}
            movies={this.props.movies}
            getMovieMatchesFound={this.props.getMovieMatchesFound}
            getMovieSelectedCount={this.props.getMovieSelectedCount}
            submitInsightsJob={this.props.submitInsightsJob}
        />
        )
      })}
      </div>
    )
  }
}

class MovieCard extends React.Component {
  get_filename(the_url) {
    const parts = the_url.split('/')
    return parts[parts.length-1]
  }

  render() {
    let loaded_status = false
    let active_status = false
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      active_status = true
    } 
    if (Object.keys(this.props.movies).includes(this.props.this_cards_movie_url)) {
      loaded_status = true
    }

    let load_as_job_button = (
        <button
            className='btn btn-link'
            onClick={() => this.props.submitInsightsJob('load_movie', this.props.this_cards_movie_url)}
        >
        queue
        </button>
    )
    let make_active_button = (
        <button
            className='btn btn-link'
            onClick={() => this.props.setCurrentVideo(this.props.this_cards_movie_url)}
        >
        load
        </button>
    )
    let framesets_count_message = 'no framesets'
    if (loaded_status) {
      let the_framesets = this.props.movies[this.props.this_cards_movie_url]['framesets']
      framesets_count_message = Object.keys(the_framesets).length.toString() + ' framesets'
    }
    if (active_status) {
      make_active_button = (
        <div
          className='row text-success'
        >
          active
        </div>
      )
    }

    const found_string = this.props.getMovieMatchesFound(this.props.this_cards_movie_url)
    const selected_string = this.props.getMovieSelectedCount(this.props.this_cards_movie_url)
    let top_div_classname = "row mt-4 card"
    if (active_status) {
      top_div_classname = "row mt-4 card active_movie_card"
    }

    return (
      <div className={top_div_classname}>
        <div className='col'>
            <div className='row'>
              <video 
                  id='video_{this.props.key}' 
                  controls 
              >
                <source
                  src={this.props.this_cards_movie_url}
                  type='video/mp4'
                />
              </video>
            </div>
          <div className='row'>
            {this.get_filename(this.props.this_cards_movie_url)}
          </div>
          <div className='row'>
            {make_active_button}
            {load_as_job_button}
          </div>
          <div className='row'>
            {framesets_count_message}
          </div>
          <div className='row'>
            {found_string}
          </div>
          <div className='row'>
            {selected_string}
          </div>
        </div>
      </div>
    )
  }
}

export default InsightsPanel;
