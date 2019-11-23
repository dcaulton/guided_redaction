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
      ping_url: 'http://127.0.0.1:8000/v1/parse/ping',
      flood_fill_url: 'http://127.0.0.1:8000/v1/analyze/flood_fill',
      arrow_fill_url: 'http://127.0.0.1:8000/v1/analyze/arrow_fill',
      scan_subimage_url: 'http://127.0.0.1:8000/v1/analyze/scan_subimage',
      analyze_url: 'http://127.0.0.1:8000/v1/analyze/',
      redact_url: 'http://127.0.0.1:8000/v1/redact/',
      parse_movie_url: 'http://127.0.0.1:8000/v1/parse/',
      zip_movie_url: 'http://127.0.0.1:8000/v1/parse/zip_movie',
      frames: [],
      framesets: {},
      movies: {},
      subimage_matches: {},
      selected_areas: {},
      roi: {},
      roi_image: '',
      showMovieParserLink: true,
      showInsightsLink: true,
      showAdvancedPanels: false,
    }
    this.getNextImageLink=this.getNextImageLink.bind(this)
    this.getPrevImageLink=this.getPrevImageLink.bind(this)
    this.handleMergeFramesets=this.handleMergeFramesets.bind(this)
    this.doMovieSplit=this.doMovieSplit.bind(this)
    this.setSubImageMatches=this.setSubImageMatches.bind(this)
    this.setSelectedArea=this.setSelectedArea.bind(this)
    this.clearMovieSelectedAreas=this.clearMovieSelectedAreas.bind(this)
    this.setRoi=this.setRoi.bind(this)
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

  async doMovieSplit(the_url, theCallback) {
    if (!the_url) {
      the_url = this.state.movie_url
    }
    if (this.state.movies[the_url]) {
      this.setActiveMovie(the_url, theCallback)
    } else {
      await fetch(this.state.parse_movie_url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
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
            app_this.setState({
              image_url: the_url,
              redacted_image_url: '',
              image_width: this.width,
              image_height: this.height,
              frameset_hash: new_frameset_hash,
              framesets: new_frameset,
              frames: new_frames,
            });
        };
    } else {
        img.onload = function(){
            app_this.setState({
              image_url: the_url,
              redacted_image_url: '',
              image_width: this.width,
              image_height: this.height,
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
    new_movie['framesets'] = new_framesets
    this.setState({
      framesets: new_framesets
    })
  }

  handleSetRedactedMovieUrl = (the_url) => {
    this.setState({
      redacted_movie_url: the_url,
    })
  }

  setSubImageMatches = (the_matches) => {
    this.setState({
      subimage_matches: the_matches,
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

  handleSetRedactedImageUrl = (the_url) => {
    this.setState({
      redacted_image_url: the_url,
    })
  }

  handleSetMaskMethod = (mask_method) => {
    this.setState({
      mask_method: mask_method,
    })
  }

  setRoi = (the_roi, the_insights_image) => {
    this.setState({
      roi: the_roi,
      roi_image: the_insights_image,
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
                zipMovieUrl={this.state.zip_movie_url}
                setRedactedMovieUrlCallback={this.handleSetRedactedMovieUrl}
                handleUpdateFramesetCallback={this.handleUpdateFrameset}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                redacted_movie_url = {this.state.redacted_movie_url}
                redact_url = {this.state.redact_url}
                handleMergeFramesets={this.handleMergeFramesets}
                doMovieSplit={this.doMovieSplit}
              />
            </Route>
            <Route path='/image'>
              <ImagePanel 
                mask_method = {this.state.mask_method}
                image_url = {this.state.image_url}
                redacted_image_url = {this.state.redacted_image_url}
                image_width = {this.state.image_width}
                image_height = {this.state.image_height}
                analyze_url = {this.state.analyze_url}
                redact_url = {this.state.redact_url}
                framesets={this.state.framesets}
                addRedactionToFrameset={this.addRedactionToFrameset}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                setMaskMethod={this.handleSetMaskMethod}
                setRedactedImageUrl={this.handleSetRedactedImageUrl}
                setImageUrlCallback={this.handleSetImageUrl}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                getNextImageLink={this.getNextImageLink}
                getPrevImageLink={this.getPrevImageLink}
                showAdvancedPanels={this.state.showAdvancedPanels}
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
                scanSubImageUrl={this.state.scan_subimage_url}
                floodFillUrl={this.state.flood_fill_url}
                arrowFillUrl={this.state.arrow_fill_url}
                setSubImageMatches={this.setSubImageMatches}
                setSelectedArea={this.setSelectedArea}
                clearMovieSelectedAreas={this.clearMovieSelectedAreas}
                setRoi={this.setRoi}
                subimage_matches={this.state.subimage_matches}
                selected_areas={this.state.selected_areas}
                roi={this.state.roi}
                roi_image={this.state.roi_image}
                ping_url={this.state.ping_url}
              />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}

export default RedactApplication;