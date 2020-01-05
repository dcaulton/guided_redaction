import React from 'react';
import ImagePanel from './ImagePanel';
import MoviePanel from './MoviePanel';
import InsightsPanel from './InsightsPanel';
import HomePanel from './HomePanel';
import {getUrlVars} from './redact_utils.js'
import './styles/guided_redaction.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

class RedactApplication extends React.Component {
  constructor(props) {
    super(props);
    const api_server_url = 'http://localhost:8000/api/'
    const api_key = ''
    this.state = {
      api_server_url: api_server_url,
      api_key: api_key,
      frameset_discriminator: 'gray8',
      mask_method: 'blur_7x7',
      image_url: '',
      movie_url: '',
      frameset_hash: '',
      image_width: 0,
      image_height: 0,
      image_scale: 1,
      ping_url: api_server_url + 'v1/parse/ping',
      flood_fill_url: api_server_url + 'v1/analyze/flood-fill',
      arrow_fill_url: api_server_url + 'v1/analyze/arrow-fill',
      scan_template_url: api_server_url + 'v1/analyze/scan-template',
      analyze_url: api_server_url + 'v1/analyze/east-tess',
      redact_url: api_server_url + 'v1/redact/redact-image',
      crop_url: api_server_url + 'v1/parse/crop-image',
      parse_movie_url: api_server_url + 'v1/parse/split-and-hash-movie',
      zip_movie_url: api_server_url + 'v1/parse/zip-movie',
      get_images_for_uuid_url: api_server_url + 'v1/parse/get-images-for-uuid',
      jobs_url: api_server_url + 'v1/jobs',
      workbooks_url: api_server_url + 'v1/workbooks/',
      current_user: 'dave.caulton@sykes.com',
      current_workbook_name: 'workbook 1',
      current_workbook_id: '',
      workbooks: [],
      movies: {},
      movie_sets: {},
      current_template_id: '',
      templates: {},
      template_matches: {},
      annotations: {},
      jobs: [],
      selected_areas: {},
      selected_area_metas: {},
      current_selected_area_meta_id: '',
      showMovieParserLink: true,
      showInsightsLink: true,
      showAdvancedPanels: false,
      whenJobLoaded: {},
      whenDoneTarget: '',
      whenDoneTargetData: {
        learn_dev: {
          api_token: '',
          catalog_uuid: '',
          get_media_upload_token_url: '',
          image_post_url: '',
          media_upload_token: '',
          landing_url: '',
        },
      }
    }

    this.getNextImageLink=this.getNextImageLink.bind(this)
    this.getPrevImageLink=this.getPrevImageLink.bind(this)
    this.handleMergeFramesets=this.handleMergeFramesets.bind(this)
    this.callOcr=this.callOcr.bind(this)
    this.callRedact=this.callRedact.bind(this)
    this.callMovieZip=this.callMovieZip.bind(this)
    this.setTemplateMatches=this.setTemplateMatches.bind(this)
    this.clearTemplateMatches=this.clearTemplateMatches.bind(this)
    this.setSelectedArea=this.setSelectedArea.bind(this)
    this.clearMovieSelectedAreas=this.clearMovieSelectedAreas.bind(this)
    this.setTemplates=this.setTemplates.bind(this)
    this.setImageScale=this.setImageScale.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
    this.doFloodFill=this.doFloodFill.bind(this)
    this.doArrowFill=this.doArrowFill.bind(this)
    this.doPing=this.doPing.bind(this)
    this.cancelJob=this.cancelJob.bind(this)
    this.submitJob=this.submitJob.bind(this)
    this.getJobs=this.getJobs.bind(this)
    this.loadJobResults=this.loadJobResults.bind(this)
    this.getWorkbooks=this.getWorkbooks.bind(this)
    this.saveWorkbook=this.saveWorkbook.bind(this)
    this.saveWorkbookName=this.saveWorkbookName.bind(this)
    this.loadWorkbook=this.loadWorkbook.bind(this)
    this.setCurrentTemplateId=this.setCurrentTemplateId.bind(this)
    this.deleteWorkbook=this.deleteWorkbook.bind(this)
    this.setSelectedAreaMetas=this.setSelectedAreaMetas.bind(this)
    this.afterUuidImagesFetched=this.afterUuidImagesFetched.bind(this)
    this.setAnnotations=this.setAnnotations.bind(this)
    this.cropImage=this.cropImage.bind(this)
    this.setMovieNickname=this.setMovieNickname.bind(this)
    this.setMovieRedactedUrl=this.setMovieRedactedUrl.bind(this)
    this.getCurrentFramesets=this.getCurrentFramesets.bind(this)
    this.getCurrentFrames=this.getCurrentFrames.bind(this)
    this.setMovieSets=this.setMovieSets.bind(this)
    this.setFramesetDiscriminator=this.setFramesetDiscriminator.bind(this)
    this.setActiveMovie=this.setActiveMovie.bind(this)
    this.getRedactedMovieUrl=this.getRedactedMovieUrl.bind(this)
    this.runTemplates=this.runTemplates.bind(this)
    this.clearCurrentFramesetRedactions=this.clearCurrentFramesetRedactions.bind(this)
    this.getRedactedImageUrl=this.getRedactedImageUrl.bind(this)
    this.getFramesetHashesInOrder=this.getFramesetHashesInOrder.bind(this)
    this.getRedactedImageFromFrameset=this.getRedactedImageFromFrameset.bind(this)
    this.gotoWhenDoneTarget=this.gotoWhenDoneTarget.bind(this)
    this.updateGlobalState=this.updateGlobalState.bind(this)
    this.getCurrentTemplateMatches=this.getCurrentTemplateMatches.bind(this)
    this.watchForJob=this.watchForJob.bind(this)
    this.unWatchJob=this.unWatchJob.bind(this)
    this.checkForJobs=this.checkForJobs.bind(this)
  }

  runTemplates(template_id, target) {
  console.log('running '+template_id+' on '+target)

  }

  getCurrentTemplateMatches() {
    return this.state.template_matches
  }

  unWatchJob(job_id) {
    let deepCopyCallbacks = JSON.parse(JSON.stringify(this.state.whenJobLoaded))
    delete deepCopyCallbacks[job_id]
    this.setState({
      whenJobLoaded: deepCopyCallbacks,
    })
  }

  watchForJob(job_id, callback=(()=>{}), deleteJob=false) {
    let deepCopyCallbacks = JSON.parse(JSON.stringify(this.state.whenJobLoaded))
    deepCopyCallbacks[job_id] = {}
    deepCopyCallbacks[job_id]['callback'] = callback
    deepCopyCallbacks[job_id]['delete'] = deleteJob
    this.setState({
      whenJobLoaded: deepCopyCallbacks,
    })
  }

  checkForJobs() {
    const jobIdsToCheckFor = Object.keys(this.state.whenJobLoaded)
    if (jobIdsToCheckFor.length) {
      this.getJobs()
      for (let index in this.state.jobs) {
        const job = this.state.jobs[index]
        if (jobIdsToCheckFor.includes(job['id'])) {
          if (job['status'] === 'success') {
            const callback = this.state.whenJobLoaded[job['id']]['callback']
            const deleteJob = this.state.whenJobLoaded[job['id']]['delete']
            this.loadJobResults(job['id'], callback)
            if (deleteJob) {
              this.cancelJob(job)
            }
            if (callback) {
              callback()
            }
            this.unWatchJob(job['id'])
          }
        }
      }
    }
    setTimeout(this.checkForJobs, 2000);
  }

  updateGlobalState(the_data) {
    try {
      const json_data = JSON.parse(the_data)
      for (let index in Object.keys(json_data)) {
        const key = Object.keys(json_data)[index]
        if (Object.keys(this.state).includes(key)) {
          let new_state = {}
          new_state[key] = json_data[key]
          this.setState(new_state)
          console.log('updated global state for '+key)
        } else {
          console.log('no key found in global state for '+key)
        }
      }
    } catch (e) {
      console.log('updateGlobalState crashed, probably bad json')
    }
  }

  gotoWhenDoneTarget() {
    console.log('going to when done target')
  }

  saveWhenDoneInfo(destination) {
    if (destination === 'learn_dev') {
      this.setState({
        whenDoneTarget: destination,
      })
    }
  }

  getFramesetHashesInOrder() {
    const frames = this.getCurrentFrames()
    let return_arr = []
    for (let i=0; i < frames.length; i++) {
      const frameset_hash = this.getFramesetHashForImageUrl(frames[i])
      if (!return_arr.includes(frameset_hash)) {
        return_arr.push(frameset_hash)
      }
    }
    return return_arr
  }

  clearCurrentFramesetRedactions(when_done=(()=>{})) {
    const the_hash = this.getFramesetHashForImageUrl(this.state.image_url)
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    if (Object.keys(deepCopyMovies).includes(this.state.movie_url)) {
      if (Object.keys(deepCopyMovies[this.state.movie_url]['framesets']).includes(the_hash)) {
        deepCopyMovies[this.state.movie_url]['framesets'][the_hash]['areas_to_redact'] = []
        deepCopyMovies[this.state.movie_url]['framesets'][the_hash]['redacted_image'] = ''
        this.setState({
          movies: deepCopyMovies
        })
      }
    }
  }

  getRedactedMovieUrl() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        let this_movie = this.state.movies[this.state.movie_url]
        if (Object.keys(this_movie).includes('redacted_movie_url')) {
          return this_movie['redacted_movie_url']
        }
      }
    }
  }

  getRedactedImageUrl() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        let movie = this.state.movies[this.state.movie_url]
        if (Object.keys(movie['framesets']).includes(this.state.frameset_hash)) {
          if (Object.keys(movie['framesets'][this.state.frameset_hash]).includes('redacted_image')) {
            return movie['framesets'][this.state.frameset_hash]['redacted_image']
          }
        }
      }
    }
  }

  setMovieRedactedUrl(the_url) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let existing_movie = deepCopyMovies[this.state.movie_url]
    if (existing_movie) {
      existing_movie['redacted_movie_url'] = the_url
      deepCopyMovies[this.state.movie_url] = existing_movie
      this.setState({
        movies: deepCopyMovies,
      })
    }
  }

  setFramesetDiscriminator(the_value, when_done=(()=>{})) {
    this.setState({
      frameset_discriminator: the_value,
    },
    when_done())
  }

  getCurrentFramesets() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        return this.state.movies[this.state.movie_url]['framesets']
      }
    }
    return []
  }

  getCurrentFrames() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        return this.state.movies[this.state.movie_url]['frames']
      }
    }
    return []
  }

  setMovieSets(the_movie_sets) {
    this.setState({
      movie_sets: the_movie_sets,
    })
  }

  setMovieNickname = (movie_url, movie_nickname) => {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let existing_movie = deepCopyMovies[movie_url]
    if (existing_movie) {
      existing_movie['nickname'] = movie_nickname
      deepCopyMovies[movie_url] = existing_movie
      this.setState({
        movies: deepCopyMovies,
      })
    }
  }

  async getImagesForUuid(the_uuid, the_offsets, when_done) {
    const the_url = this.state.get_images_for_uuid_url + '?uuid=' + the_uuid
    let response = await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson['images'], the_offsets)
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  async cropImage(image_url, start, end, anchor_id, when_done=(()=>{})) {
    const the_url = this.state.crop_url
    let response = await fetch(the_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        image_url: image_url,
        anchor_id: anchor_id,
        start: start,
        end: end,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  handleSetImageUuid(the_uuid, the_offsets) {
    this.getImagesForUuid(the_uuid, the_offsets, this.afterUuidImagesFetched)
  }

  afterUuidImagesFetched(image_urls, the_offsets) {
    let offset_arr = the_offsets.split(',')
    let image_url_arr = []
    for (let i=0; i < offset_arr.length; i++) {
      image_url_arr.push(image_urls[parseInt(offset_arr[i])])
    }

    let the_framesets = {}
    for (let i=0; i < image_url_arr.length; i++) {
      the_framesets[i] = {images: [image_url_arr[i]]}
    }

    let movie_obj = {
      frames: image_url_arr,
      framesets: the_framesets,
    }
    let movies_obj = {
      'new_movie_url': movie_obj,
    }

    this.setState({
      movies: movies_obj,
      movie_url: 'new_movie_url',
    })
    this.handleSetImageUrl(image_url_arr[0])
  }

  setTemplates = (the_templates) => {
    this.setState({
      templates: the_templates,
    })
  }

  setAnnotations(the_annotations) {
    this.setState({
      annotations: the_annotations,
    })
  }

  setSelectedAreaMetas = (the_metas, meta_id_to_make_active='') => {
    if (meta_id_to_make_active) {
      this.setState({
        selected_area_metas: the_metas,
        current_selected_area_meta_id: meta_id_to_make_active,
      })
    } else {
      this.setState({
        selected_area_metas: the_metas,
      })
    }
  }

  setImageScale= (the_scale) => {
    this.setState({
      image_scale: the_scale,
    })
  }

  setJobs = (the_jobs) => {
    this.setState({
      jobs: the_jobs,
    })
  }

  setWorkbooks = (the_workbooks) => {
    if (!the_workbooks.length) {
      this.setState({
        workbooks: the_workbooks,
        current_workbook_id: '',
        current_workbook_name: 'workbook 1',
      })
    } else {
      this.setState({
        workbooks: the_workbooks,
      })
    }
  }

  componentDidMount() {
    this.checkForInboundGetParameters()
    if (!this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'none'
    }
    if (!this.state.showInsightsLink) {
      document.getElementById('insights_link').style.display = 'none'
    }
    this.checkForJobs()
  }

  setActiveMovie(the_url, theCallback=(()=>{})) {
    const the_movie = this.state.movies[the_url]
    if (this.state.movie_url !== the_url) {
      this.setState({
        movie_url: the_url,
      })
    }
    theCallback(the_movie.framesets)
  }

  buildJsonHeaders() {
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
    if (this.state.api_key) {
      headers['Authorization'] = 'Api-Key ' + this.state.api_key
    }
    return headers
  }

  storeRedactedImage(responseJson, when_done=(()=>{})) {
    let local_framesets = JSON.parse(JSON.stringify(this.getCurrentFramesets()));
    const frameset_hash = this.getFramesetHashForImageUrl(responseJson['original_image_url'])
    let frameset = local_framesets[frameset_hash]
    frameset['redacted_image'] = responseJson['redacted_image_url']
    local_framesets[frameset_hash] = frameset
    this.handleUpdateFrameset(frameset_hash, frameset)
    when_done()
  }

  async callRedact(areas_to_redact_short, image_url, when_done=(()=>{})) {
    let response = await fetch(this.state.redact_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        areas_to_redact: areas_to_redact_short,
        mask_method: this.state.mask_method,
        image_url: image_url,
        return_type: 'url',
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.storeRedactedImage(responseJson)
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  callOcr(current_click, last_click, when_done) {
    fetch(this.state.analyze_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        roi_start_x: last_click[0],
        roi_start_y: last_click[1],
        roi_end_x: current_click[0],
        roi_end_y: current_click[1],
        image_url: this.state.image_url,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let new_areas_to_redact = responseJson['recognized_text_areas']
      let deepCopyAreasToRedact = this.getRedactionFromFrameset()
      for (let i=0; i < new_areas_to_redact.length; i++) {
        deepCopyAreasToRedact.push(new_areas_to_redact[i]);
      }
      this.addRedactionToFrameset(deepCopyAreasToRedact)
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error)
    })
    return []
  }

  addMovieAndSetActive(movie_url, movies, theCallback=(()=>{})) {
    this.setState({
      movie_url: movie_url, 
      movies: movies,
    },
    theCallback(movies[movie_url]['framesets'])
    )
  }

  getMovieNicknameFromUrl(the_url) {
    let url_parts = the_url.split('/')
    let name_parts = url_parts[url_parts.length-1].split('.')
    let file_name_before_dot = name_parts[name_parts.length-2]
    return file_name_before_dot
  }

  getRedactedMovieFilename() {
    //TODO this is not friendly to file names with more than one period, or with a slash in them
    let parts = this.state.movie_url.split('/')
    let file_parts = parts[parts.length-1].split('.')
    let new_filename = file_parts[0] + '_redacted.' + file_parts[1]
    return new_filename
  }

  async callMovieZip(the_urls, when_done) {
    document.getElementById('movieparser_status').innerHTML = 'calling movie zipper'
    let new_movie_name = this.getRedactedMovieFilename()
    await fetch(this.state.zip_movie_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        image_urls: the_urls,
        movie_name: new_movie_name,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const movie_url = responseJson['movie_url']
      const deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
      let movie = deepCopyMovies[this.state.movie_url]
      movie['redacted_movie_url'] = movie_url
      deepCopyMovies[this.state.movie_url] = movie
      this.setState({
        movies: deepCopyMovies,
      })
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    });
  } 

  async doFloodFill(x_scaled, y_scaled, insights_image, selected_areas, cur_hash, selected_area_meta_id) {
    await fetch(this.state.flood_fill_url, {                                      
      method: 'POST',                                                           
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({                                                    
        source_image_url: insights_image,                            
        tolerance: 5,                                                           
        selected_point : [x_scaled, y_scaled],                                  
      }),                                                                       
    })                                                                          
    .then((response) => response.json())                                        
    .then((responseJson) => {                                                   
      const sa_id = Math.floor(Math.random(1000000, 9999999)*1000000000)        
      const new_sa = {                                                          
          'id': sa_id,                                                          
          'start': responseJson['flood_fill_regions'][0],                       
          'end': responseJson['flood_fill_regions'][1],                         
      }
      let deepCopySelectedAreas= JSON.parse(JSON.stringify(selected_areas))
      deepCopySelectedAreas.push(new_sa)
      this.setSelectedArea(deepCopySelectedAreas, insights_image, this.state.movie_url, cur_hash)
    })
    .catch((error) => { 
      console.error(error);
    })
  } 

  async doArrowFill(x_scaled, y_scaled, insights_image, selected_areas, cur_hash, selected_area_meta_id, when_done) {
    await fetch(this.state.arrow_fill_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        source_image_url: insights_image,
        tolerance: 5,
        selected_point : [x_scaled, y_scaled],
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const sa_id = Math.floor(Math.random(1000000, 9999999)*1000000000)
      const new_sa = {
          'id': sa_id,
          'start': responseJson['arrow_fill_regions'][0],
          'end': responseJson['arrow_fill_regions'][1],
      }
      let deepCopySelectedAreas= JSON.parse(JSON.stringify(selected_areas))
      deepCopySelectedAreas.push(new_sa)
      this.setSelectedArea(deepCopySelectedAreas, insights_image, this.state.movie_url, cur_hash)
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async doPing(when_done_success, when_done_failure) {                                                              
    await fetch(this.state.ping_url, {                                          
      method: 'GET',                                                            
      headers: this.buildJsonHeaders(),
    })                                                                          
    .then((response) => response.json())                                        
    .then((responseJson) => {                                                   
      when_done_success(responseJson)
    })                                                                          
    .catch((error) => {                                                         
      when_done_failure()
    })                                                                          
  }

  updateMoviesWithTemplateMatchResults(template_id) {
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    const template_matches = this.getCurrentTemplateMatches()
    let something_changed = false
    if (Object.keys(template_matches).includes(template_id)) {
      const template_match = template_matches[template_id]
      const mask_zones = this.state.templates[template_id]['mask_zones']
      const movie_urls = Object.keys(template_match)
      for (let j=0; j < movie_urls.length; j++) {
        const movie_url = movie_urls[j]
        const frameset_hashes = Object.keys(template_match[movie_url])
        for (let k=0; k < frameset_hashes.length; k++) {
          const frameset_hash = frameset_hashes[k]
          const anchor_ids = Object.keys(template_match[movie_url][frameset_hash])
          const anchor_id = anchor_ids[0]
          const anchor_found_coords = template_match[movie_url][frameset_hash][anchor_id]['location']
          const anchor_spec_coords = this.state.templates[template_id]['anchors'][0]['start']
          for (let m=0; m < mask_zones.length; m++) {
            const mask_zone = mask_zones[m]
            const offset = [
              anchor_found_coords[0] - anchor_spec_coords[0], 
              anchor_found_coords[1] - anchor_spec_coords[1]
            ] 
            const new_start = [mask_zone['start'][0] + offset[0], mask_zone['start'][1] + offset[1]]
            const new_end = [mask_zone['end'][0] + offset[0], mask_zone['end'][1] + offset[1]]
            const new_area_to_redact = {
              'start': new_start,
              'end': new_end,
            }
            if (!Object.keys(deepCopyMovies[movie_url]['framesets'][frameset_hash]).includes('areas_to_redact')) {
              deepCopyMovies[movie_url]['framesets'][frameset_hash]['areas_to_redact']= []
            } 
            deepCopyMovies[movie_url]['framesets'][frameset_hash]['areas_to_redact'].push(new_area_to_redact)
            something_changed = true
          }
        }
      }
    }
    if (something_changed) {
      this.setState({
        movies: deepCopyMovies,
      })
    }
  }

  loadScanTemplateResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const request_data = JSON.parse(job.request_data)
    const template_id = request_data['template']['id']
    this.setTemplateMatches(template_id, response_data)
    if (!Object.keys(this.state.templates).includes(template_id)) {
      let deepCopyTemplates= JSON.parse(JSON.stringify(this.state.templates))
      let template = request_data['template']
      deepCopyTemplates[template_id] = template
      this.setTemplates(deepCopyTemplates)
      this.setCurrentTemplateId(template_id)

      const cur_movies = Object.keys(this.state.movies)
      let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
      let movie_add = false
      let movie_url = ''
      for (let j=0; j < Object.keys(request_data['target_movies']).length; j++)  {
        movie_url = Object.keys(request_data['target_movies'])[j]
        if (!cur_movies.includes(movie_url)) {
          let movie_data = request_data['target_movies'][movie_url]
          deepCopyMovies[movie_url] = movie_data
          movie_add = true
        }
      }
      if (movie_add) {
        this.addMovieAndSetActive(movie_url, deepCopyMovies, when_done)
      }
    }
    this.updateMoviesWithTemplateMatchResults(template_id)
    when_done()
  }

  loadSplitAndHashResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const request_data = JSON.parse(job.request_data)
    let frames = response_data.frames
    let frameset_discriminator = request_data.frameset_discriminator
    let framesets = response_data.unique_frames
    let frame_dimensions = response_data.frame_dimensions
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    deepCopyMovies[request_data['movie_url']] = {
      nickname: this.getMovieNicknameFromUrl(request_data['movie_url']),
      frames: frames,
      framesets: framesets,
      frame_dimensions: frame_dimensions,
      frameset_discriminator: frameset_discriminator,
    }
    this.addMovieAndSetActive(
      request_data['movie_url'],
      deepCopyMovies,
      when_done,
    )
  }

  async loadRedactResults(job, when_done=(()=>{})) {
    for (let i=0; i < job.children.length; i++) {
      const child_id = job.children[i]
      let job_url = this.state.jobs_url + '//' + child_id
      await fetch(job_url, {
        method: 'GET',
        headers: this.buildJsonHeaders(),
      })
      .then((response) => response.json())
      .then((responseJson) => {
        const resp_data_string = responseJson['job']['response_data']
        const resp_data = JSON.parse(resp_data_string)
        var app_this = this
        function cancelTheJob() {
          app_this.cancelJob(job)
        }
        if (i === job.children.length-1) {
          this.storeRedactedImage(resp_data, cancelTheJob)
        } else {
          this.storeRedactedImage(resp_data)
        }
      })
      .then((responseJson) => {
        when_done()
      })
      .catch((error) => {
        console.error(error);
      })
    }
  }

  async loadJobResults(job_id, when_done=(()=>{})) {
    let job_url = this.state.jobs_url + '//' + job_id
    await fetch(job_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
			const job = responseJson['job']
			if (job.app === 'analyze' && job.operation === 'scan_template') {
        this.loadScanTemplateResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'split_and_hash_movie') {
//        this.loadSplitAndHashResults(job)
        this.loadSplitAndHashResults(job, when_done)
			} else if (job.app === 'redact' && job.operation === 'redact') {
        this.loadRedactResults(job, when_done)
      }
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async getJobs() {
    let the_url = this.state.jobs_url
    if (this.state.current_workbook_id) {
        the_url += '?workbook_id=' + this.state.current_workbook_id
    } 
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setJobs(responseJson['jobs'])
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async submitJob(the_job_data, when_submit_complete=(()=>{}), cancel_after_loading=false, when_fetched=(()=>{})) {
    await fetch(this.state.jobs_url + '/', {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        app: the_job_data['app'],
        operation: the_job_data['operation'],
        request_data: the_job_data['request_data'],
        response_data: the_job_data['response_data'],
        owner: this.state.current_user,
        description: the_job_data['description'],
        workbook_id: this.state.current_workbook_id,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_submit_complete(responseJson)
      return responseJson
    })
    .then((responseJson) => {
      this.watchForJob(responseJson['job_id'], when_fetched, cancel_after_loading)
    })
    .then(() => {
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async cancelJob(the_job) {
    // the following double slash is wrong but I'm tired of fighting with DRF 
    // It comes back to the api urls file.  If I don't specify a trailing slash
    //   after the jobs base url, 'list jobs' above won't work, because, 
    //   even if I specify this.state.jobs_url with no trailing slash, the 
    //   get call for getJobs() will append a slash, then 404 on me
    let the_uuid = the_job['id']
    let the_url = this.state.jobs_url + '//' + the_uuid
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async getWorkbooks() {
    await fetch(this.state.workbooks_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setWorkbooks(responseJson['workbooks'])
    })
    .catch((error) => {
      console.error(error);
    })
  }

  saveWorkbookName(the_name) {
    let new_workbook_id = ''
    for (let i=0; i < this.state.workbooks.length; i++) {
      if (this.state.workbooks[i]['name'] === the_name) {
        new_workbook_id = this.state.workbooks[i]['id']
      }
    }
    this.setState({
      current_workbook_name: the_name,
      current_workbook_id: new_workbook_id,
    })
  }

  async saveWorkbook(when_done=(()=>{})) {
    await fetch(this.state.workbooks_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        state_data: this.state,
        owner: this.state.current_user,
        name: this.state.current_workbook_name,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setState({
        current_workbook_id: responseJson['workbook_id']
      })
      this.getWorkbooks()
      // delete/load buttons aren't updating on BottomInsightsControl so force em
      this.forceUpdate()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async setCurrentTemplateId(template_id, when_done=(()=>{})) {
    this.setState({
      current_template_id: template_id,
    }, when_done())
  }

  async loadWorkbook(workbook_id, when_done=(()=>{})) {
    if (workbook_id === '-1') {
      this.setState({
        current_workbook_id: '',
      })
      when_done()
      return
    }
    let wb_url = this.state.workbooks_url + '/' + workbook_id
    await fetch(wb_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const dont_add_keys = ['workbooks', 'jobs', 'workbooks_url', 'whenDoneTarget']
      let wb = responseJson['workbook']
      let wb_state_data = JSON.parse(wb.state_data)
      let wb_keys = Object.keys(wb_state_data)
      let new_state = {}
      for (let j=0; j < wb_keys.length; j++) {
        let state_data_key = wb_keys[j]
        if (!dont_add_keys.includes(state_data_key)) {
          new_state[state_data_key] = wb_state_data[state_data_key]
        }
      } 
      new_state['current_workbook_name'] = wb.name
      new_state['current_workbook_id'] = wb.id
      this.setState(new_state)
    })
    .then(() => {
      this.getJobs()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deleteWorkbook(workbook_id, when_done=(()=>{})) {
    let the_url = this.state.workbooks_url+ '/' + workbook_id
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      this.getWorkbooks()
      // delete/load buttons aren't updating on BottomInsightsControl so force em
      this.forceUpdate()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  getCurrentTemplateAnchors() {
    if (Object.keys(this.state.templates).includes(this.state.current_template_id)) {
      return this.state.templates[this.state.current_template_id]['anchors']
    } else {
      return []
    }
  }

  getFramesetHashForImageUrl = (image_url) => {
    const framesets = this.getCurrentFramesets()
    const hashes = Object.keys(framesets)
    for (let i=0; i < hashes.length; i++) {
      let the_images = framesets[hashes[i]]['images']
      if (the_images.includes(image_url)) {
        return hashes[i]
      }
    }
  }

  checkForInboundGetParameters() {
    let vars = getUrlVars()
    if (Object.keys(vars).includes('when_done')) {
      this.saveWhenDoneInfo(vars['when_done'])
    } 
    if (Object.keys(vars).includes('workbook_id')) {
      this.loadWorkbook(vars['workbook_id'])
    }
    if (Object.keys(vars).includes('image_url')) {
        this.handleSetImageUrl(vars['image_url'])
        document.getElementById('image_panel_link').click()
    } else if (Object.keys(vars).includes('movie_url')) {
        this.handleSetMovieUrl(vars['movie_url'])
        document.getElementById('movie_panel_link').click()
    } else if (Object.keys(vars).includes('image_uuid') && Object.keys(vars).includes('offsets')) {
        this.handleSetImageUuid(vars['image_uuid'], vars['offsets'])
        this.getImagesForUuid(vars['image_uuid'], vars['offsets'], this.afterUuidImagesFetched)
        document.getElementById('image_panel_link').click()
    }
  }

  getNextImageLink() {
    const framesets = this.getCurrentFramesets()
    let hashes = this.getFramesetHashesInOrder()
    if (hashes.length < 2) {
      return ''
    }
    if (this.state.frameset_hash) {
      let cur_index = hashes.indexOf(this.state.frameset_hash)
      if (cur_index < (hashes.length-1)) {
        const next_hash = hashes[cur_index + 1]
        const next_image_url = framesets[next_hash]['images'][0]
        return next_image_url
      } 
    }
    return ''
  }

  getPrevImageLink() {
    const framesets = this.getCurrentFramesets()
    let hashes = this.getFramesetHashesInOrder()
    if (this.state.frameset_hash) {
      let cur_index = hashes.indexOf(this.state.frameset_hash)
      if (cur_index > 0) {
        const prev_hash = hashes[cur_index - 1]
        const prev_image_url = framesets[prev_hash]['images'][0]
        return prev_image_url
      } 
    }
    return ''
  }

  makeNewFrameFrameset(the_url) {
    if (!Object.keys(this.state.movies).length) {
      let new_frameset_hash = '1'
      let new_movie_url = 'whatever'
      let new_frameset = {
        images: [the_url]
      }
      let framesets = {}
      framesets[new_frameset_hash] = new_frameset
      let new_movie = {
        frames: [the_url],
        framesets: framesets,
      }
      let movies = {}
      movies[new_movie_url] = new_movie
      this.setState({
        movies: movies,
        movie_url: new_movie_url,
      })
      return new_frameset_hash
    }
    return 999  // don't expect to ever get here
  }

  handleSetImageUrl = (the_url) => {
    let frameset_hash = this.getFramesetHashForImageUrl(the_url)
    if (!frameset_hash) {
      frameset_hash = this.makeNewFrameFrameset(the_url) 
    }
    var img = new Image()
    var app_this = this
    img.onload = function(){
        const scale = this.width / this.naturalWidth
        app_this.setState({
          image_url: the_url,
          image_width: this.width,
          image_height: this.height,
          image_scale: scale,
          frameset_hash: frameset_hash,
        })
    }
    img.src = the_url
  }

  handleSetMovieUrl = (the_url) => {
    // TODO have this check campaign_movies  to see if we already have framesets and frames
    this.setState({
      movie_url: the_url,
      image_url: '',
      frameset_hash: '',
      showMovieParserLink: true,
    })
    document.getElementById('movie_panel_link').style.display = 'block'
  }

  handleUpdateFrameset = (the_hash, the_frameset) => {
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    deepCopyMovies[this.state.movie_url]['framesets'][the_hash] = the_frameset
    this.setState({
      movies: deepCopyMovies
    })
  }

  setTemplateMatches = (template_id, the_matches) => {
    let deepCopyTemplateMatches = JSON.parse(JSON.stringify(this.state.template_matches))
    deepCopyTemplateMatches[template_id] = the_matches
    this.setState({
      template_matches: deepCopyTemplateMatches,
    })
  }
 
  clearTemplateMatches = (template_id, the_matches) => {
    this.setState({
      template_matches: {},
    })
  }

  // TODO fix this.  If we know the frameset, we don't need the image url
  //   it wouldn't even make sense for the same framesets to have two images with diff stuff
  setSelectedArea = (the_areas, the_image, the_movie, the_frameset_hash) => {
    let deepCopySelectedAreas= JSON.parse(JSON.stringify(this.state.selected_areas))
    let movie_obj = {}
    if (Object.keys(deepCopySelectedAreas).includes(the_movie)) {
      movie_obj = deepCopySelectedAreas[the_movie]
    }
    let frameset_obj = {}
    if (Object.keys(movie_obj).includes(the_frameset_hash)) {
      frameset_obj = movie_obj[the_frameset_hash]
    }
    frameset_obj[the_image] = the_areas
    movie_obj[the_frameset_hash] = frameset_obj
    deepCopySelectedAreas[the_movie] = movie_obj
    this.setState({
      selected_areas: deepCopySelectedAreas,
    })
  }

  clearMovieSelectedAreas = (the_movie) => {
    let deepCopySelectedAreas= JSON.parse(JSON.stringify(this.state.selected_areas))
    delete deepCopySelectedAreas[this.state.movie_url]
    this.setState({
      selected_areas: deepCopySelectedAreas,
    })
  }

  handleSetMaskMethod = (mask_method) => {
    this.setState({
      mask_method: mask_method,
    })
  }

  handleMergeFramesets = (target_hash, source_hash) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.getCurrentFramesets()))
    const source_frameset = deepCopyFramesets[source_hash]
    let new_target_frameset = deepCopyFramesets[target_hash]
    let new_target_images = new_target_frameset['images'].concat(source_frameset['images'])
    if (new_target_frameset['areas_to_redact']) {
      if (source_frameset['areas_to_redact']) {
        let new_a2r = new_target_frameset['areas_to_redact'].concat(source_frameset['areas_to_redact'])
        new_target_frameset['areas_to_redact'] = new_a2r
      }
    } else if (source_frameset['areas_to_redact']) {
      new_target_frameset['areas_to_redact'] = source_frameset['areas_to_redact']
    }
    new_target_frameset['images'] = new_target_images
    deepCopyFramesets[target_hash] = new_target_frameset
    delete deepCopyFramesets[source_hash]
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let cur_movie = deepCopyMovies[this.state.movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[this.state.movie_url] = cur_movie
    this.setState({
      movies: deepCopyMovies,
    })
  }

  addRedactionToFrameset = (areas_to_redact) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.getCurrentFramesets()))
    deepCopyFramesets[this.state.frameset_hash]['areas_to_redact'] = areas_to_redact
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let cur_movie = deepCopyMovies[this.state.movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[this.state.movie_url] = cur_movie
    this.setState({
        movies: deepCopyMovies,
    })
  }

  getRedactionFromFrameset = (frameset_hash) => {
    const framesets = this.getCurrentFramesets()
    if (!framesets || !this.state.frameset_hash) {
        return []
    }
    let the_hash = frameset_hash || this.state.frameset_hash
    let frameset = framesets[the_hash]
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

  getRedactedImageFromFrameset = (frameset_hash) => {
    const framesets = this.getCurrentFramesets()
    let the_hash = frameset_hash || this.state.frameset_hash
    let frameset = framesets[the_hash]
    if (frameset) {
      if (Object.keys(frameset).includes('redacted_image')) {
          return frameset['redacted_image']
      } else {
          return ''
      }
    } else {
      return ''
    }
  }

  render() {
    if (document.getElementById('movie_panel_link') && this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'block'
    }
    return (
      <Router>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
          <li className="nav-item">
            <Link className='nav-link' id='home_link' to='/redact'>RedactUI</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='image_panel_link' to='/redact/image'>Image</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='movie_panel_link' to='/redact/movie'>Movie</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='insights_link' to='/redact/insights'>Insights</Link>
          </li>
        </ul>
        </nav>
        <div id='container' className='container'>
          <Switch>
            <Route exact path='/redact'>
              <HomePanel 
                setMovieUrlCallback={this.handleSetMovieUrl}
                setImageUrlCallback={this.handleSetImageUrl}
                showMovieParserLink={this.state.showMovieParserLink}l
              />
            </Route>
            <Route path='/redact/movie'>
              <MoviePanel 
                movie_url = {this.state.movie_url}
                getCurrentFrames={this.getCurrentFrames}
                getCurrentFramesets={this.getCurrentFramesets}
                mask_method = {this.state.mask_method}
                setMaskMethod={this.handleSetMaskMethod}
                setImageUrlCallback={this.handleSetImageUrl}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                getRedactedImageFromFrameset={this.getRedactedImageFromFrameset}
                callMovieZip={this.callMovieZip}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                callRedact={this.callRedact}
                handleMergeFramesets={this.handleMergeFramesets}
                movies={this.state.movies}
                frameset_discriminator={this.state.frameset_discriminator}
                setFramesetDiscriminator={this.setFramesetDiscriminator}
                getRedactedMovieUrl={this.getRedactedMovieUrl}
                setMovieRedactedUrl={this.setMovieRedactedUrl}
                templates={this.state.templates}
                runTemplates={this.runTemplates}
                getFramesetHashesInOrder={this.getFramesetHashesInOrder}
                getJobs={this.getJobs}
                submitJob={this.submitJob}
                loadJobResults={this.loadJobResults}
                cancelJob={this.cancelJob}
                jobs={this.state.jobs}
                watchForJob={this.watchForJob}
              />
            </Route>
            <Route path='/redact/image'>
              <ImagePanel 
                mask_method={this.state.mask_method}
                image_url={this.state.image_url}
                getRedactedImageUrl={this.getRedactedImageUrl}
                image_width={this.state.image_width}
                image_height={this.state.image_height}
                image_scale={this.state.image_scale}
                addRedactionToFrameset={this.addRedactionToFrameset}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                setMaskMethod={this.handleSetMaskMethod}
                setImageUrlCallback={this.handleSetImageUrl}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                getNextImageLink={this.getNextImageLink}
                getPrevImageLink={this.getPrevImageLink}
                setImageScale={this.setImageScale}
                showAdvancedPanels={this.state.showAdvancedPanels}
                callOcr={this.callOcr}
                callRedact={this.callRedact}
                templates={this.state.templates}
                runTemplates={this.runTemplates}
                clearCurrentFramesetRedactions={this.clearCurrentFramesetRedactions}
                whenDoneTarget={this.state.whenDoneTarget}
                gotoWhenDoneTarget={this.gotoWhenDoneTarget}
              />
            </Route>
            <Route path='/redact/insights'>
              <InsightsPanel  
                setMovieUrlCallback={this.handleSetMovieUrl}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                movie_url={this.state.movie_url}
                movies={this.state.movies}
                getCurrentFramesets={this.getCurrentFramesets}
                getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
                setTemplateMatches={this.setTemplateMatches}
                clearTemplateMatches={this.clearTemplateMatches}
                setSelectedArea={this.setSelectedArea}
                clearMovieSelectedAreas={this.clearMovieSelectedAreas}
                getCurrentTemplateMatches={this.getCurrentTemplateMatches}
                selected_areas={this.state.selected_areas}
                doPing={this.doPing}
                templates={this.state.templates}
                setTemplates={this.setTemplates}
                doFloodFill={this.doFloodFill}
                doArrowFill={this.doArrowFill}
                cancelJob={this.cancelJob}
                submitJob={this.submitJob}
                getJobs={this.getJobs}
                loadJobResults={this.loadJobResults}
                getWorkbooks={this.getWorkbooks}
                saveWorkbook={this.saveWorkbook}
                saveWorkbookName={this.saveWorkbookName}
                setCurrentTemplateId={this.setCurrentTemplateId}
                current_template_id={this.state.current_template_id}
                loadWorkbook={this.loadWorkbook}
                deleteWorkbook={this.deleteWorkbook}
                jobs={this.state.jobs}
                workbooks={this.state.workbooks}
                current_workbook_name={this.state.current_workbook_name}
                current_workbook_id={this.state.current_workbook_id}
                setSelectedAreaMetas={this.setSelectedAreaMetas}
                selected_area_metas={this.state.selected_area_metas}
                current_selected_area_meta_id={this.state.current_selected_area_meta_id}
                setAnnotations={this.setAnnotations}
                annotations={this.state.annotations}
                cropImage={this.cropImage}
                setMovieNickname={this.setMovieNickname}
                movie_sets={this.state.movie_sets}
                setMovieSets={this.setMovieSets}
                frameset_discriminator={this.state.frameset_discriminator}
                setFramesetDiscriminator={this.setFramesetDiscriminator}
                setActiveMovie={this.setActiveMovie}
                updateGlobalState={this.updateGlobalState}
              />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

export default RedactApplication;
