import React from 'react';

class MovieParserPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      frame_frameset_view_mode: 'frame',
    }
  }

  componentDidMount() {
    document.getElementById('frame_inactive').style.display = 'none';
    document.getElementById('frameset_active').style.display = 'none';
  }

  showFrameSets() {
  }

  showFrames() {
  }

  toggleFrameFramesetViewMode() {
    let new_mode = ''
    if (this.state.frame_frameset_view_mode === 'frame') {
      new_mode = 'frameset'
      document.getElementById('frame_active').style.display = 'inline';
      document.getElementById('frame_inactive').style.display = 'none';
      document.getElementById('frameset_active').style.display = 'none';
      document.getElementById('frameset_inactive').style.display = 'inline';
      this.showFrameSets()
    } else {
      new_mode = 'frame'
      document.getElementById('frame_active').style.display = 'none';
      document.getElementById('frame_inactive').style.display = 'inline';
      document.getElementById('frameset_active').style.display = 'inline';
      document.getElementById('frameset_inactive').style.display = 'none';
      this.showFrames()
    }
    this.setState({
      frame_frameset_view_mode: new_mode,
    })
  } 

  parseVideo = () => {
    alert('bazinga.  or whatever')
  }

  render() {
    return (
      <div id='movie_parser_panel'>
        <div id='video_and_meta' className='row mt-3'>
          <div id='video_div' className='col-md-6'>
            <video id='video_id' controls >
              <source src="http://127.0.0.1:3000/images/hybris_address.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div id='video_meta_div' className='col-md-6'>
            <div className='row'>
              <button 
                  className='btn btn-primary' 
                  onClick={this.parseVideo}
              >
                Parse Video
              </button>
            </div>
            <div className='row'>
              other Metadata
            </div>
          </div>
        </div>
        <div id='frame_and_frameset_data' className='row mt-3'>
          <div id='frame_frameset_header'>
            <div id='ffh_frame_title'>
              <button
                  id='frame_active'
                  className='btn btn-secondary'
              >
                Displaying all Frames
              </button>
              <button
                  id='frame_inactive'
                  className='btn btn-primary'
                  onClick={() => this.toggleFrameFramesetViewMode()}
              >
                Show Frames
              </button>
            </div>
            <div id='ffh_frameset_title'>
              <button
                  id='frameset_active'
                  className='btn btn-secondary'
              >
                Displaying all FrameSets
              </button>
              <button
                  id='frameset_inactive'
                  className='btn btn-primary'
                  onClick={() => this.toggleFrameFramesetViewMode()}
              >
                Show FrameSets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MovieParserPanel;
