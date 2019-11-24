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
      image_scale: 1,
      insights_title: 'Insights, load a movie to get started',
      insights_message: '',
      prev_coords: (0,0),
      clicked_coords: (0,0),
    }
    this.getSelectedAreas=this.getSelectedAreas.bind(this)
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.clearCurrentTemplateAnchor=this.clearCurrentTemplateAnchor.bind(this)
    this.scanTemplate=this.scanTemplate.bind(this)
    this.getTemplateMatches=this.getTemplateMatches.bind(this)
    this.clearTemplateMatches=this.clearTemplateMatches.bind(this)
    this.clearSelectedAreas=this.clearSelectedAreas.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.getMovieMatchesFound=this.getMovieMatchesFound.bind(this)
    this.getMovieSelectedCount=this.getMovieSelectedCount.bind(this)
    this.currentImageIsTemplateAnchorImage=this.currentImageIsTemplateAnchorImage.bind(this)
    this.doPing=this.doPing.bind(this)
    this.getCurrentTemplateAnchors=this.getCurrentTemplateAnchors.bind(this)
  }

  getCurrentTemplateAnchors() {
    if (Object.keys(this.props.templates).includes(this.props.current_template_id)) {
      return this.props.templates[this.props.current_template_id]['anchors']
    } else {
      return []
    }
  }

  currentImageIsTemplateAnchorImage() {
    if (this.props.current_template_id) {
      let key = this.props.current_template_id
      let cur_template_anchor_image_name = this.props.templates[key]['anchors'][0]['image']
      return (cur_template_anchor_image_name === this.state.insights_image)
    }
    return false
  }

  scanTemplate(scope) {
    if (scope === 'all_movies') {
      this.callTemplateScanner(this.props.movies)
    } else if (scope === 'movie') {
      const the_movie = this.props.movies[this.props.movie_url]
      const wrap = {}
      wrap[this.props.movie_url] = the_movie
      this.callTemplateScanner(wrap)
    } else if (scope === 'image') {
      this.callTemplateScanner([], this.props.insights_image)
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

  async doPing() {
    await fetch(this.props.ping_url, {
      method: 'GET',
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (responseJson.response === 'pong') {
        this.setState({
          insights_message: 'ping succeeded',
        })
      }
    })
    .catch((error) => {
      console.error(error);
        this.setState({
          insights_message: 'ping failed',
        })
    })
  }

  async callTemplateScanner(movies=[], image='') {
    let anchors = this.getCurrentTemplateAnchors()
    await fetch(this.props.scanTemplateUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_url: this.state.insights_image,
        anchors: anchors, 
        target_movies: movies,
        target_image: image,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let matches = responseJson.matches
      this.props.setTemplateMatches(this.props.current_template_id, matches)
    })
    .catch((error) => {
      console.error(error);
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
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    let cur_template = deepCopyTemplates(this.props.current_template_id)
    cur_template['anchors'] =[]
    deepCopyTemplates[this.props.current_template_id] = cur_template
    this.props.setTemplates(deepCopyTemplates)
    this.setState({
      insights_message: 'Anchor has been cleared'
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

    if (this.state.mode === 'add_template_anchor_1') {
      this.doAddTemplateAnchorClickOne(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'add_template_anchor_2') {
      this.addCurrentTemplateAnchor(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'flood_fill_1') {
      this.doFloodFill(scale, x_scaled, y_scaled)
    } else if (this.state.mode === 'arrow_fill_1') {
      this.doArrowFill(scale, x_scaled, y_scaled)
    }
  }

  async doFloodFill(scale, x_scaled, y_scaled) {
    this.setState({
      image_scale: scale,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'Calling flood fill api',
    })
    await fetch(this.props.floodFillUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_url: this.state.insights_image,
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
      let deepCopySelectedAreas= JSON.parse(JSON.stringify(this.getSelectedAreas()))
      deepCopySelectedAreas.push(new_sa)
      const cur_hash = this.getScrubberFramesetHash() 
      this.props.setSelectedArea(deepCopySelectedAreas, this.state.insights_image, this.props.movie_url, cur_hash)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async doArrowFill(scale, x_scaled, y_scaled) {
    this.setState({
      image_scale: scale,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'Calling arrow fill api',
    })
    await fetch(this.props.arrowFillUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_url: this.state.insights_image,
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
      let deepCopySelectedAreas= JSON.parse(JSON.stringify(this.getSelectedAreas()))
      deepCopySelectedAreas.push(new_sa)
      const cur_hash = this.getScrubberFramesetHash() 
      this.props.setSelectedArea(deepCopySelectedAreas, this.state.insights_image, this.props.movie_url, cur_hash)
    })
    .then(() => {
      this.setState({
        insights_message: 'Fill area added, click to add another.',
      })
    })
    .catch((error) => {
      console.error(error);
    })
  }

  doAddTemplateAnchorClickOne(scale, x_scaled, y_scaled) {
    this.setState({
      image_scale: scale,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'pick the second corner of the ROI',
      mode: 'add_template_anchor_2',
    })
  }

  createTemplateSkeleton() {
    const template_id = 'template_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let the_template = {
      'id': template_id,
      'name': 'template_' + template_id.toString(),
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
      image_scale: scale,
      prev_coords: this.state.clicked_coords,
      clicked_coords: [x_scaled, y_scaled],
      insights_message: 'Anchor has been added',
      mode: 'add_template_anchor_3',
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
        })
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

  render() {
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
        <div id='insights_left' className='col-md-3'>
          <MovieCardList 
            setCurrentVideo={this.setCurrentVideo}
            movie_url={this.props.movie_url}
            movie_urls={this.state.campaign_movies}
            movies={this.props.movies}
            getMovieMatchesFound={this.getMovieMatchesFound}
            getMovieSelectedCount={this.getMovieSelectedCount}
          />
        </div>
        <div id='insights_middle' className='col md-7 ml-4'>
          <div 
              className='row'
              id='insights_header'
          >
            <div className='col'>
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
              getCurrentTemplateAnchors={this.getCurrentTemplateAnchors}
              image_scale={this.state.image_scale}
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
            scanTemplate={this.scanTemplate}
            clearTemplateMatches={this.clearTemplateMatches}
            clearSelectedAreas={this.clearSelectedAreas}
            clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
            insights_image={this.state.insights_image}
            doPing={this.doPing}
          />
        </div>
      </div>
    );
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

    let the_button = (
      <div className='row'>
        <button
            className='btn btn-link'
            onClick={() => this.props.setCurrentVideo(this.props.this_cards_movie_url)}
        >
        make active
        </button>
      </div>
    )
    let framesets_count_message = 'no framesets'
    if (loaded_status) {
      let the_framesets = this.props.movies[this.props.this_cards_movie_url]['framesets']
      framesets_count_message = Object.keys(the_framesets).length + ' framesets'
    }
    if (active_status) {
      the_button = (
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
          <div className='row ml-1'>
            {the_button}
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
