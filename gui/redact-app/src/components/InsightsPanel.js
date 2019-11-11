import React from 'react';

class InsightsPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      currentMovie: {},
      currentCampaign: '',
      campaigns: [],
      movies: {},
    }
  }

  changeCampaign = (newCampaignName) => {
    console.log('campaign is now '+newCampaignName)
  }

  scrubberOnChange() {
    let value = document.getElementById('movie_scrubber').value
    console.log(value)
    // find image for that value (0 - 100, integers only), bring it up
  }

  setCurrentVideo(video_id) {
    console.log('current video is now '+video_id)
  }

  render() {
    return (
    <div id='insights_panel' className='row mt-5'>
      <div id='insights_left' className='col-md-3'>
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
                onClick={() => this.setCurrentVideo('hybris_address_1')}
            >
            make current
            </button>
          </div>
        </div>
        <div className='row mt-4'>
          <video id='video_2' controls >
            <source
              src='http://localhost:3000/images/hybris_address.mp4'
              type='video/mp4'
            />
          </video>
        </div>
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
      <div id='insights_right' className='col-md-2'>
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

export default InsightsPanel;
