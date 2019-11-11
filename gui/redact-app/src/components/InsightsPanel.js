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
    let value = document.getElementById('movie_scrubber').value
    let keys = Object.keys(this.props.framesets)
    let new_frameset_hash = keys[value]
    let the_url = this.props.framesets[new_frameset_hash]['images'][0]
    document.getElementById('insights_image').src = the_url
  }

  movieSplitDone() {
    let len = Object.keys(this.props.framesets).length
    document.getElementById('movie_scrubber').max = len
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
        <div className='row mt-4'>
          <video id='video_1' controls >
            <source
              src='http://localhost:3000/images/hybris_address.mp4'
              type='video/mp4'
            />
          </video>
          <div>Hybris Address 1</div>
          <div>
            <button
                className='btn btn-link'
                onClick={() => this.props.setCurrentVideo('http://localhost:3000/images/hybris_address.mp4')}
            >
            make current
            </button>
          </div>
        </div>
        <div className='row mt-4'>
          <video id='video_2' controls >
            <source
              src='http://localhost:3000/images/hybris_address2.mp4'
              type='video/mp4'
            />
          </video>
          <div>Hybris Address 2</div>
          <div>
            <button
                className='btn btn-link'
                onClick={() => this.props.setCurrentVideo('http://localhost:3000/images/hybris_address2.mp4')}
            >
            make current
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default InsightsPanel;
