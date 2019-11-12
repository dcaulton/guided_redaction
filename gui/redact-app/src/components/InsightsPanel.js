import React from 'react';

class InsightsPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      currentCampaign: '',
      campaigns: [],
      campaign_movies: [
        'http://localhost:3000/images/hybris_address.mp4',
        'http://localhost:3000/images/hybris_address2.mp4',
      ],
      frameset_starts: {},
    }
    this.setCurrentVideo=this.setCurrentVideo.bind(this)
    this.movieSplitDone=this.movieSplitDone.bind(this)
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
  }

  changeCampaign = (newCampaignName) => {
    console.log('campaign is now '+newCampaignName)
  }

  scrubberOnChange() {
    const value = document.getElementById('movie_scrubber').value
    const keys = Object.keys(this.props.framesets)
    const new_frameset_hash = keys[value]
    const the_url = this.props.framesets[new_frameset_hash]['images'][0]
    document.getElementById('insights_image').src = the_url
  }

  movieSplitDone() {
    const len = Object.keys(this.props.framesets).length
    document.getElementById('movie_scrubber').max = len-1
    const first_key = Object.keys(this.props.framesets)[0]
    const first_image = this.props.framesets[first_key]['images'][0]
    document.getElementById('insights_image').src = first_image
  }

  setCurrentVideo(video_url) {
    this.props.doMovieSplit(video_url, this.movieSplitDone)
  }

  render() {
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
        <div id='insights_middle' className='col-md-7 ml-4'>
          <img 
              id='insights_image' 
              src='http://localhost:3000/images/frame_00185.png' 
              alt='whatever'
          />
          <input 
              id='movie_scrubber' 
              type='range' 
              defaultValue='0'
              onChange={this.scrubberOnChange}
          />
        </div>
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
    let active_status = false
    let the_button = (
      <button
          className='btn btn-link'
          onClick={() => this.props.setCurrentVideo(this.props.this_cards_movie_url)}
      >
      load and make current
      </button>
    )
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      active_status = true
      the_button = ''
    }
    let framesets_count_message = 'no framesets'
    const loaded_movie_keys = Object.keys(this.props.movies)
    if (loaded_movie_keys.includes(this.props.this_cards_movie_url) 
        && 'framesets' in this.props.movies[this.props.this_cards_movie_url]) {
      let the_framesets = this.props.movies[this.props.this_cards_movie_url].framesets
      framesets_count_message = Object.keys(the_framesets).length + ' framesets'
      the_button = ''
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
          <div className='row'>
            {the_button}
          </div>
          <div className={active_status? 'row text-success' : 'row'} >
            {active_status? 'active' : ''}
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
