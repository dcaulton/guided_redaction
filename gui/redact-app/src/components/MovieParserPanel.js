import React from 'react';

class MovieParserPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      frame_frameset_view_mode: 'frame',
      frames: [
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00095.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00096.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00097.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00098.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00099.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00100.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00101.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00102.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00103.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00104.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00105.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00106.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00107.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00108.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00109.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00110.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00111.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00112.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00113.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00114.png",
        "http://localhost:8080/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00115.png",
      ],
      framesets: {
        "4611686018429812866": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00383.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00384.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00385.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00386.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00387.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00388.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00390.png"
        ],
        "9223372036857200770": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00389.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00392.png"
        ],
        "9367487224933056642": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00391.png"
        ],
        "9223376452083581058": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00393.png"
        ],
        "4611686035609682050": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00394.png"
        ],
        "4611686035607585154": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00395.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00399.png"
        ],
        "9223372054034973058": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00396.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00397.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00398.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00400.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00401.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00402.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00403.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00404.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00405.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00406.png"
        ],
        "9223376456384709122": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00407.png"
        ],
        "9223372054043230722": [
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00408.png",
            "./work/7feb2e00-0a7d-4926-8052-10c57135b5c0/frame_00409.png"
        ]
      },
    }
  }

  componentDidMount() {
    document.getElementById('frame_inactive').style.display = 'none';
    document.getElementById('frameset_active').style.display = 'none';
    document.getElementById('frameset_cards').style.display = 'none';
  }

  toggleFrameFramesetViewMode() {
    let new_mode = ''
    if (this.state.frame_frameset_view_mode === 'frame') {
      new_mode = 'frameset'
      alert('ming')
      document.getElementById('frame_active').style.display = 'inline';
      document.getElementById('frame_inactive').style.display = 'none';
      document.getElementById('frameset_active').style.display = 'none';
      document.getElementById('frameset_inactive').style.display = 'inline';
      document.getElementById('frameset_cards').style.display = 'block';
      document.getElementById('frame_cards').style.display = 'none';
    } else {
      new_mode = 'frame'
      document.getElementById('frame_active').style.display = 'none';
      document.getElementById('frame_inactive').style.display = 'inline';
      document.getElementById('frameset_active').style.display = 'inline';
      document.getElementById('frameset_inactive').style.display = 'none';
      document.getElementById('frameset_cards').style.display = 'none';
      document.getElementById('frame_cards').style.display = 'block';
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
          <div id='frame_cards' className='col-md-12'>
            <div id='cards_row' className='row m-5'>
              <FrameCardList 
                frames={this.state.frames}
              />
            </div>
          </div>
          <div id='frameset_cards' className='col-md-12'>
            <div id='cards_row' className='row m-5'>
              <FramesetCardList 
                frames={this.state.frames}
                framesets={this.state.framesets}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class ImageCard extends React.Component {
  render() {
    return (
      <div className='col-md-2 frameCard m-3 p-3 bg-light'>
        <h5 className='card-title'>{this.props.image_name}</h5>
        <img src={this.props.image_url} alt='whatever'/>
        <div className='card-body'>
          <p className='card-text'>stuff</p>
        </div>
      </div>
    )
  }
}

class FramesetCard extends React.Component {
  render() {
    return (
      <div className='col-md-2 frameCard m-3 p-3 bg-light'>
        <h5 className='card-title'>{this.props.frame_hash}</h5>
        <div className='card-body'>
          <p className='card-text'>{this.props.frame_images}</p>
        </div>
      </div>
    )
  }
}
class FramesetCardList extends React.Component {
  render() {
    return (
      <FramesetCard
        frame_hash='babish'
        frame_images='bobnish'
        key='floof'
      />
    )
  }
}

class FrameCardList extends React.Component {

  getNameFor(image_name) {
      let s = image_name.substring(image_name.lastIndexOf('/')+1, image_name.length);
      s = s.substring(0, s.indexOf('.'))
      return s
  }

  render() {
    let items = this.props.frames.map((item) =>
      <ImageCard
        image_url={item}
        image_name={this.getNameFor(item)}
        key={item}
      />
    );
    return items
  }
}

export default MovieParserPanel;
