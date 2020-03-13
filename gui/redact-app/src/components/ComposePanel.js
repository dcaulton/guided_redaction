import React from 'react'

class ComposePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      compose_image: '',
      compose_image_title: '',
      image_width: 1000,
      image_height: 1000,
      compose_image_scale: 1,
    }
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
  }

  componentDidMount() {
    this.scrubberOnChange()
  }

  scrubberOnChange() {
    const framesets = this.props.getCurrentFramesets()
    const value = document.getElementById('compose_scrubber').value
    const keys = this.props.getFramesetHashesInOrder()
    const new_frameset_hash = keys[value]
    if (Object.keys(framesets).includes(new_frameset_hash) &&
        Object.keys(framesets[new_frameset_hash]).includes('images')) {
      const the_url = framesets[new_frameset_hash]['images'][0]
      this.setState({
        compose_image: the_url,
        compose_image_title: the_url,
      }, this.setImageSize(the_url))
    }
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
        }, app_this.setImageScale()
        )
      }
    }
  }

  setImageScale() {
    const scale = (document.getElementById('compose_image').width /
        document.getElementById('compose_image').naturalWidth)
    this.setState({
      compose_image_scale: scale,
    })
  }

  getImageOffsetHeight() {
    let bottom_y = 0
    if (this.state.compose_image) {
      bottom_y += document.getElementById('compose_image').offsetHeight
    }
    return bottom_y
  }

  render() {
    let imageDivStyle= {
      width: this.props.image_width,
      height: this.props.image_height,
    }
    let the_display='block'
    let image_bottom_y = this.getImageOffsetHeight()
    if (!this.state.compose_image) {
      the_display='none'
    }
    const image_offset_style = {
      display: the_display,
      top: image_bottom_y,
    }
    return (
      <div id='compose_panel_container'>
        <div id='compose_panel'>

          <div id='compose_header' className='row position-relative'>
            <div className='col'>
            header
            </div>
          </div>

          <div id='compose_movie_and_scrubber_div' className='row position-relative'>
            <div className='col-lg-9 ml-0 mr-0 pl-0 pr-0'>
              <div 
                  id='compose_image_div' 
                  className='row position-absolute'
                  style={imageDivStyle}

              >
                <img
                    id='compose_image'
                    className='p-0 m-0 mw-100 mh-100'
                    src={this.state.compose_image}
                    alt={this.state.compose_image}
                />
              </div>
              <div
                  id='compose_scrubber_div'
                  className='row position-relative mr-0 ml-0 pl-0 pr-0'
                  style={image_offset_style}
              >
                <input
                    id='compose_scrubber'
                    type='range'
                    defaultValue='0'
                    onChange={this.scrubberOnChange}
                />
              </div>
            </div>
          </div>

          <div 
              id='compose_movie_footer' 
              className='row position-relative'
              style={image_offset_style}
          >
            <div className='col'>
            movie footer
            </div>
          </div>

          <div 
              id='sequence_area' 
              className='row position-relative'
              style={image_offset_style}
          >
          sequence
          </div>
         
        </div>
      </div>
    );
  }
}

export default ComposePanel;
