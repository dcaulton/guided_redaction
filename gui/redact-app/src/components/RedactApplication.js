import React from 'react';
import ImagePanel from './ImagePanel';
import MoviePanel from './MoviePanel';
import InsightsPanel from './InsightsPanel';
import HomePanel from './HomePanel';
import {getUrlVars} from './redact_utils.js'
import '../App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

class RedactApplication extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mask_method: 'blur_7x7',
      image_url: '',
      redacted_movie_url: '',
      redacted_image_url: '',
      movie_url: '',
      frameset_hash: '',
      image_width: 0,
      image_height: 0,
      image_scale: 1,
//      ping_url: 'https:///step-work.dev.sykes.com/api/v1/parse/ping',
//      flood_fill_url: 'http:///step-work.dev.sykes.com/api/v1/analyze/flood-fill',
//      arrow_fill_url: 'http:///step-work.dev.sykes.com/api/v1/analyze/arrow-fill',
//      scan_template_url: 'http:///step-work.dev.sykes.com/api/v1/analyze/scan-template',
//      analyze_url: 'http:///step-work.dev.sykes.com/api/v1/analyze/east-tess',
//      redact_url: 'http:///step-work.dev.sykes.com/api/v1/redact/redact-image',
//      parse_movie_url: 'http:///step-work.dev.sykes.com/api/v1/parse/split-and-hash-movie',
//      zip_movie_url: 'http:///step-work.dev.sykes.com/api/v1/parse/zip-movie',
      api_key: '',
      ping_url: 'http://127.0.0.1:8000/v1/parse/ping/',
      flood_fill_url: 'http://127.0.0.1:8000/v1/analyze/flood-fill/',
      arrow_fill_url: 'http://127.0.0.1:8000/v1/analyze/arrow-fill/',
      scan_template_url: 'http://127.0.0.1:8000/v1/analyze/scan-template/',
      analyze_url: 'http://127.0.0.1:8000/v1/analyze/east-tess/',
      redact_url: 'http://127.0.0.1:8000/v1/redact/redact-image/',
      parse_movie_url: 'http://127.0.0.1:8000/v1/parse/split-and-hash-movie/',
      zip_movie_url: 'http://127.0.0.1:8000/v1/parse/zip-movie/',
      jobs_url: 'http://127.0.0.1:8000/v1/jobs/',
      frames: [],
      framesets: {},
      movies: {},
      template_matches: {},
      templates: {},
      jobs: [],
      current_template_id: '',
      selected_areas: {},
      showMovieParserLink: true,
      showInsightsLink: true,
      showAdvancedPanels: false,
    }
    this.getNextImageLink=this.getNextImageLink.bind(this)
    this.getPrevImageLink=this.getPrevImageLink.bind(this)
    this.handleMergeFramesets=this.handleMergeFramesets.bind(this)
    this.doMovieSplit=this.doMovieSplit.bind(this)
    this.callOcr=this.callOcr.bind(this)
    this.callRedact=this.callRedact.bind(this)
    this.callMovieZip=this.callMovieZip.bind(this)
    this.setTemplateMatches=this.setTemplateMatches.bind(this)
    this.clearTemplateMatches=this.clearTemplateMatches.bind(this)
    this.setSelectedArea=this.setSelectedArea.bind(this)
    this.clearMovieSelectedAreas=this.clearMovieSelectedAreas.bind(this)
    this.setTemplates=this.setTemplates.bind(this)
    this.setImageScale=this.setImageScale.bind(this)
    this.setCurrentTemplate=this.setCurrentTemplate.bind(this)
    this.callTemplateScanner=this.callTemplateScanner.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
    this.doFloodFill=this.doFloodFill.bind(this)
    this.doArrowFill=this.doArrowFill.bind(this)
    this.doPing=this.doPing.bind(this)
    this.cancelJob=this.cancelJob.bind(this)
    this.submitJob=this.submitJob.bind(this)
    this.getJobs=this.getJobs.bind(this)
  }

  setTemplates = (the_templates) => {
    this.setState({
      templates: the_templates,
    })
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

  setCurrentTemplate = (current_template_id) => {
    this.setState({
      current_template_id: current_template_id,
    })
  }

  componentDidMount() {
    this.checkForInboundImageOrMovie()
    if (!this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'none'
    }
    if (!this.state.showInsightsLink) {
      document.getElementById('insights_link').style.display = 'none'
    }
  }

  setActiveMovie(the_url, theCallback) {
    const the_movie = this.state.movies[the_url]
    if (this.state.movie_url !== the_url) {
      this.setState({
        movie_url: the_url,
        frames: the_movie.frames,
        framesets: the_movie.framesets,
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

  async callRedact(areas_to_redact_short, image_url, when_done) {
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
      let redacted_image_url = responseJson['redacted_image_url']
      this.setRedactedImageUrl(redacted_image_url)

      let local_framesets = JSON.parse(JSON.stringify(this.state.framesets));
      const frameset_hash = this.getFramesetHashForImageUrl(responseJson['original_image_url'])
      let frameset = local_framesets[frameset_hash]
      frameset['redacted_image'] = responseJson['redacted_image_url']
      local_framesets[frameset_hash] = frameset
      this.handleUpdateFrameset(frameset_hash, frameset)

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

  async doMovieSplit(the_url, theCallback) {
    if (!the_url) {
      the_url = this.state.movie_url
    }
    if (this.state.movies[the_url]) {
      this.setActiveMovie(the_url, theCallback)
    } else {
      await fetch(this.state.parse_movie_url, {
        method: 'POST',
        headers: this.buildJsonHeaders(),
        body: JSON.stringify({
          movie_url: the_url,
        }),
      })
      .then((response) => response.json())
      .then((responseJson) => {
        let frames = responseJson.frames
        let framesets = responseJson.unique_frames
        let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
        deepCopyMovies[the_url] = {
          frames: frames,
          framesets: framesets,
        }
        this.setState({
          movie_url: the_url, 
          frames: frames,
          framesets: framesets,
          movies: deepCopyMovies,
        },
        theCallback(framesets)
        )
      })
      .catch((error) => {
        console.error(error);
      })
    }
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
      let movie_url = responseJson['movie_url']
      this.setState({
        redacted_movie_url: movie_url,
      })
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    });
  } 

  async callTemplateScanner(source_image, movies=[], image='') {
    let anchors = this.getCurrentTemplateAnchors()
    await fetch(this.state.scan_template_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        source_image_url: source_image,
        anchors: anchors,
        target_movies: movies,
        target_image: image,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let matches = responseJson.matches
      this.setTemplateMatches(this.state.current_template_id, matches)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async doFloodFill(x_scaled, y_scaled, insights_image, selected_areas, cur_hash) {
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

  async doArrowFill(x_scaled, y_scaled, insights_image, selected_areas, cur_hash, when_done) {
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

  async getJobs() {
    await fetch(this.state.jobs_url, {
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

  async submitJob(the_job_data) {
    await fetch(this.state.jobs_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        app: the_job_data['app'],
        operation: the_job_data['operation'],
        request_data: the_job_data['request_data'],
        response_data: the_job_data['response_data'],
        owner: 'stevie wonder',
        description: the_job_data['description'],
      }),
    })
    .then(() => {
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async cancelJob(the_uuid) {
    let the_url = this.state.jobs_url + the_uuid + '/'
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

  getCurrentTemplateAnchors() {
    if (Object.keys(this.state.templates).includes(this.state.current_template_id)) {
      return this.state.templates[this.state.current_template_id]['anchors']
    } else {
      return []
    }
  }

  getFramesetHashForImageUrl = (image_url) => {
    const hashes = Object.keys(this.state.framesets)
    for (let i=0; i < hashes.length; i++) {
      let the_images = this.state.framesets[hashes[i]]['images']
      if (the_images.includes(image_url)) {
        return hashes[i]
      }
    }
  }

  checkForInboundImageOrMovie() {
    let vars = getUrlVars()
    if (Object.keys(vars).includes('image_url')) {
        this.handleSetImageUrl(vars['image_url'])
        document.getElementById('image_panel_link').click()
    } else if (Object.keys(vars).includes('movie_url')) {
        this.handleSetMovieUrl(vars['movie_url'])
        document.getElementById('movie_panel_link').click()
    }
  }

  getNextImageLink() {
    let hashes = Object.keys(this.state.framesets)
    if (this.state.frameset_hash) {
      let cur_index = hashes.indexOf(this.state.frameset_hash)
      if (cur_index < (hashes.length-1)) {
        const next_hash = hashes[cur_index + 1]
        const next_image_url = this.state.framesets[next_hash]['images'][0]
        return next_image_url
      } 
    }
    return ''
  }

  getPrevImageLink() {
    let hashes = Object.keys(this.state.framesets)
    if (this.state.frameset_hash) {
      let cur_index = hashes.indexOf(this.state.frameset_hash)
      if (cur_index > 0) {
        const prev_hash = hashes[cur_index - 1]
        const prev_image_url = this.state.framesets[prev_hash]['images'][0]
        return prev_image_url
      } 
    }
    return ''
  }

  makeNewFrameFrameset(the_url) {
      let new_frameset = {
          "-1": {
              "images": [the_url]
          }
      }
      let new_frames = [the_url]
      let new_frameset_hash = '-1'
      return ([new_frameset, new_frames, new_frameset_hash])
  }

  handleSetImageUrl = (the_url) => {
    let create_frameset = false
    let new_frameset = {}
    let new_frames = []
    let new_frameset_hash = ''
    if (!this.state.framesets) {
        create_frameset = true
        let yy = this.makeNewFrameFrameset(the_url) 
        new_frameset = yy[0]
        new_frames = yy[1] 
        new_frameset_hash = yy[2]
    } else {
        new_frameset_hash = this.getFramesetHashForImageUrl(the_url)
        if (!new_frameset_hash) {
            create_frameset = true
            let yy = this.makeNewFrameFrameset(the_url) 
            new_frameset = yy[0]
            new_frames = yy[1] 
            new_frameset_hash = yy[2]
        }
    }
    var img = new Image()
    var app_this = this
    if (create_frameset) {
        img.onload = function(){
            const scale = this.width / this.naturalWidth
            app_this.setState({
              image_url: the_url,
              redacted_image_url: '',
              image_width: this.width,
              image_height: this.height,
              image_scale: scale,
              frameset_hash: new_frameset_hash,
              framesets: new_frameset,
              frames: new_frames,
            });
        };
    } else {
        img.onload = function(){
            const scale = this.width / this.naturalWidth
            app_this.setState({
              image_url: the_url,
              redacted_image_url: '',
              image_width: this.width,
              image_height: this.height,
              image_scale: scale,
              frameset_hash: new_frameset_hash,
            })
        }
    }
    img.src = the_url
  }

  handleSetMovieUrl = (the_url) => {
    // TODO have this check campaign_movies  to see if we already have framesets and frames
    this.setState({
      movie_url: the_url,
      image_url: '',
      frames: [],
      framesets: {},
      frameset_hash: '',
      showMovieParserLink: true,
    })
    document.getElementById('movie_panel_link').style.display = 'block'
  }

  handleUpdateFrameset = (the_hash, the_frameset) => {
    // DMC update the frameset in this.state.movies too, 
    let new_framesets = this.state.framesets
    new_framesets[the_hash] = the_frameset
    let new_movie = this.state.movies[this.state.movie_url]
    if (new_movie) { 
      new_movie['framesets'] = new_framesets
      this.setState({
        framesets: new_framesets
      })
    }
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

  setRedactedImageUrl = (the_url) => {
    this.setState({
      redacted_image_url: the_url,
    })
  }

  handleSetMaskMethod = (mask_method) => {
    this.setState({
      mask_method: mask_method,
    })
  }

  handleMergeFramesets = (target_hash, source_hash) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.state.framesets))
    const source_frameset = this.state.framesets[source_hash]
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
    this.setState({
      framesets:deepCopyFramesets,
    })
  }

  addRedactionToFrameset = (areas_to_redact) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.state.framesets))
    deepCopyFramesets[this.state.frameset_hash]['areas_to_redact'] = areas_to_redact
    this.setState({
        framesets: deepCopyFramesets,
    })
  }

  getRedactionFromFrameset = (frameset_hash) => {
    if (!this.state.framesets || !this.state.frameset_hash) {
        return []
    }
    let the_hash = frameset_hash || this.state.frameset_hash
    let frameset = this.state.framesets[the_hash]
    if (Object.keys(frameset).indexOf('areas_to_redact') > -1) {
        return frameset['areas_to_redact']
    } else {
        return []
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
            <Link className='nav-link' id='home_link' to='/'>RedactUI</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='image_panel_link' to='/image'>Images</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='movie_panel_link' to='/movie'>Movies</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='insights_link' to='/insights'>Insights</Link>
          </li>
        </ul>
        </nav>
        <div id='container' className='container'>
          <Switch>
            <Route exact path='/'>
              <HomePanel 
                setMovieUrlCallback={this.handleSetMovieUrl}
                setImageUrlCallback={this.handleSetImageUrl}
                showMovieParserLink={this.state.showMovieParserLink}
              />
            </Route>
            <Route path='/movie'>
              <MoviePanel 
                movie_url = {this.state.movie_url}
                frames={this.state.frames}
                framesets={this.state.framesets}
                mask_method = {this.state.mask_method}
                setImageUrlCallback={this.handleSetImageUrl}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                callMovieZip={this.callMovieZip}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                redacted_movie_url = {this.state.redacted_movie_url}
                callRedact={this.callRedact}
                handleMergeFramesets={this.handleMergeFramesets}
                doMovieSplit={this.doMovieSplit}
              />
            </Route>
            <Route path='/image'>
              <ImagePanel 
                mask_method={this.state.mask_method}
                image_url={this.state.image_url}
                redacted_image_url={this.state.redacted_image_url}
                image_width={this.state.image_width}
                image_height={this.state.image_height}
                image_scale={this.state.image_scale}
                framesets={this.state.framesets}
                addRedactionToFrameset={this.addRedactionToFrameset}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                setMaskMethod={this.handleSetMaskMethod}
                setRedactedImageUrl={this.setRedactedImageUrl}
                setImageUrlCallback={this.handleSetImageUrl}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                getNextImageLink={this.getNextImageLink}
                getPrevImageLink={this.getPrevImageLink}
                setImageScale={this.setImageScale}
                showAdvancedPanels={this.state.showAdvancedPanels}
                callOcr={this.callOcr}
                callRedact={this.callRedact}
              />
            </Route>
            <Route path='/insights'>
              <InsightsPanel  
                setMovieUrlCallback={this.handleSetMovieUrl}
                doMovieSplit={this.doMovieSplit}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                movie_url={this.state.movie_url}
                movies={this.state.movies}
                framesets={this.state.framesets}
                callTemplateScanner={this.callTemplateScanner}
                getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
                setTemplateMatches={this.setTemplateMatches}
                clearTemplateMatches={this.clearTemplateMatches}
                setSelectedArea={this.setSelectedArea}
                clearMovieSelectedAreas={this.clearMovieSelectedAreas}
                template_matches={this.state.template_matches}
                selected_areas={this.state.selected_areas}
                doPing={this.doPing}
                templates={this.state.templates}
                current_template_id={this.state.current_template_id}
                setTemplates={this.setTemplates}
                setCurrentTemplate={this.setCurrentTemplate}
                doFloodFill={this.doFloodFill}
                doArrowFill={this.doArrowFill}
                cancelJob={this.cancelJob}
                submitJob={this.submitJob}
                getJobs={this.getJobs}
                jobs={this.state.jobs}
              />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

export default RedactApplication;
