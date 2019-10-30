import React from 'react';

class MovieParserPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      frame_frameset_view_mode: 'frame',
      frames: [],
      framesets: {},
    }
  }

  componentDidMount() {
    document.getElementById('frame_inactive').style.display = 'none';
    document.getElementById('frameset_active').style.display = 'none';
    this.showFrames();
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
          <div id='frame_frameset_header' className='col-md-12'>
            <div className='row container'>
              <div id='ffh_frame_title' className='col-md-3'>
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
              <div id='ffh_frameset_title' className='col-md-3'>
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
          <div id='frame_frameset_data' className='col-md-12'>
            <div className='row m-5'>
              <div className='col-md-2 frameCard m-3 p-3 bg-light'>
                <h5 className='card-title'>frame_00185</h5>
                <img src='http://127.0.0.1:3000/images/frame_00185.png' alt='whatever'/>
                <div className='card-body'>
                  <p className='card-text'>other stuff</p>
                </div>
              </div>
              <div className='col-md-2 frameCard m-3 p-3 bg-light'>
                <h5 className='card-title'>frame_00187</h5>
                <img src='http://127.0.0.1:3000/images/frame_00187.png' alt='whatever'/>
                <div className='card-body'>
                  <p className='card-text'>stuff</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MovieParserPanel;
