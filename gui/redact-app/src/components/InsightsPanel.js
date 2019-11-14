import React from 'react';
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
      roi: {},
      insights_image: '',
      image_width: 100,
      image_height: 100,
      image_scale: 1,
      insights_title: 'Insights, load a movie to get started',
      insights_message: '',
      clicked_coords: (0,0),
      subimage_matches: {},
    }
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.handleSetMode=this.handleSetMode.bind(this)
    this.clearRoi=this.clearRoi.bind(this)
    this.scanSubImage=this.scanSubImage.bind(this)
    this.scanRecognizedText=this.scanRecognizedText.bind(this)
  this.getSubImageMatches=this.getSubImageMatches.bind(this)

  }

  scanSubImage() {
    this.callSubImageScanner()
  }

  async callSubImageScanner() {
    await fetch(this.props.scanSubImageUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_url: this.state.insights_image,
        subimage_start: this.state.roi['start'],
        subimage_end: this.state.roi['end'],
        roi_id: this.state.roi['id'],
        targets: this.props.movies,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      let matches = responseJson.matches
      this.setState({
        subimage_matches: matches,
      })
    })
    .catch((error) => {
      console.error(error);
    })
  }

  scanRecognizedText() {
  }

  changeCampaign = (newCampaignName) => {
    console.log('campaign is now '+newCampaignName)
  }

  handleSetMode(the_mode) {
    let the_message = ''
    if (the_mode === 'add_roi_1') {
      the_message = 'Select the first corner of the Region of Interest'
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
  
  clearRoi() {
    this.setState({
      roi: {},
      insights_message: 'ROI has been cleared'
    })
  }

  movieSplitDone() {
    const len = Object.keys(this.props.framesets).length
    document.getElementById('movie_scrubber').max = len-1
    const first_key = Object.keys(this.props.framesets)[0]
    const first_image = this.props.framesets[first_key]['images'][0]
    this.setState({
      insights_image: first_image,
      insights_title: first_image,
      insights_message: '.',
    }, this.setImageSize)
  }

  setCurrentVideo(video_url) {
    this.props.doMovieSplit(video_url, this.movieSplitDone)
  }

  handleImageClick = (e) => {
    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY
    console.log('clicked at ('+x+', '+y+')')
    const scale = (document.getElementById('insights_image').width / 
        document.getElementById('insights_image').naturalWidth)
    const x_scaled = parseInt(x / scale)
    const y_scaled = parseInt(y / scale)
    console.log('click in image coords is  at ('+x_scaled+', '+y_scaled+')')

    if (this.state.mode === 'add_roi_1') {
      this.setState({
        image_scale: scale,
        clicked_coords: [x_scaled, y_scaled],
        insights_message: 'pick the second corner of the ROI',
        mode: 'add_roi_2',
      })
    } else if (this.state.mode === 'add_roi_2') {
      const roi_id = Math.floor(Math.random(1000000, 9999999)*1000000000)
      const the_roi = {
          'id': roi_id,
          'start': this.state.clicked_coords, 
          'end': [x_scaled, y_scaled],
      }
      this.setState({
        image_scale: scale,
        prev_coords: this.state.clicked_coords,
        clicked_coords: [x_scaled, y_scaled],
        roi: the_roi,
        insights_message: 'ROI selected.  press scan to see any matches',
        mode: 'add_roi_3',
      })
    }
  }

  setImageSize() {
    var app_this = this
    if (this.state.insights_image) {
      let img = new Image()
      img.src = this.state.insights_image
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

  getSubImageMatches() {
  let cur_hash = this.getScrubberFramesetHash()
  console.log('current_hash is '+cur_hash)
  if (this.state.subimage_matches && Object.keys(this.state.subimage_matches).includes(this.props.movie_url)) {
    let sim = this.state.subimage_matches[this.props.movie_url]
    if (Object.keys(sim).includes(cur_hash)) {
      let first_subimage_match_key = Object.keys(sim[cur_hash])[0].toString()
      let roi_id_str = this.state.roi['id'].toString()
      if (first_subimage_match_key === roi_id_str) {
        let location = sim[cur_hash][roi_id_str]['location']
        return location
      }
    }
  }
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
              roi={this.state.roi}
              image_scale={this.state.image_scale}
              getSubImageMatches={this.getSubImageMatches}
              subimage_matches={this.state.subimage_matches}
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
            clearRoiCallback={this.clearRoi}
            scanSubImage={this.scanSubImage}
            insights_image={this.state.insights_image}
          />
        </div>
{/*
        <div id='insights_right' className='col'>
          <div className='row mt-5'>                                            
            <select                                                           
                name='mask_method'                                            
                onChange={(event) => this.changeCampaign(event.target.value)} 
            >                                                                 
              <option value=''>-- campaign --</option>                        
              <option value='TestCampaign'>test campaign</option>             
            </select>                                                         
          </div>  
        </div>
*/}
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
console.log('  current url is '+this.props.this_cards_movie_url+'*')
      active_status = true
    } else {
console.log('  current url is '+this.props.this_cards_movie_url)
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



    return (
      <div className='row mt-4 card'>
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
        </div>
      </div>
    )
  }
}

export default InsightsPanel;
