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
      movie_offset_string: '',
    }
    this.scrubberOnChange=this.scrubberOnChange.bind(this)
    this.removeSequenceFrame=this.removeSequenceFrame.bind(this)
    this.gotoSequenceFrame=this.gotoSequenceFrame.bind(this)
  }

  componentDidMount() {
    this.scrubberOnChange()
    if (!Object.keys(this.props.movies).includes('sequence')) {
      this.props.establishNewEmptyMovie('sequence', false)
    }
  }

  setScrubberMax(the_number) {
    document.getElementById('compose_scrubber').max = the_number
  }

  gotoSequenceFrame(frame_url_to_goto) {
    const movie = this.props.movies[this.props.movie_url]
    if (movie['frames'].includes(frame_url_to_goto)) {
      const index = movie['frames'].indexOf(frame_url_to_goto)
      document.getElementById('compose_scrubber').value = index
      this.scrubberOnChange()
    }
  }

  removeSequenceFrame(frame_url_to_delete) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(deepCopyMovies['sequence']))
    let build_frames = []
    let build_framesets = {}
    for (let i=0; i < movie['frames'].length; i++) {
      const frame_url = movie['frames'][i]
      if (frame_url !== frame_url_to_delete) {
        build_frames.push(frame_url)
        build_framesets[build_frames.length-1] = movie['framesets'][i]
      }
    }
    movie['frames'] = build_frames
    movie['framesets'] = build_framesets
    deepCopyMovies['sequence'] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    const num_frames = movie['frames'].length
    this.setScrubberMax(num_frames)
    if (this.props.movie_url === 'sequence') { // set scrubber to 0 to be sure we're in range
      document.getElementById('compose_scrubber').value = 0
      this.scrubberOnChange()
    }
  }

  updateMovieOffset(offset_in_seconds) {
    if (!this.props.movie_url) {
      return
    }
    const mins_offset = Math.floor(parseInt(offset_in_seconds) / 60)
    const secs_offset = parseInt(offset_in_seconds) % 60
    const secs_string = secs_offset.toString()
    const build_string = 'position ' + mins_offset.toString() + ':' + secs_string.padStart(2, '0')
    this.setState({
      movie_offset_string: build_string,
    })
  }

  scrubberOnChange() {
    const frames = this.props.getCurrentFrames()
    if (!frames) {
      this.setState({compose_image: ''})
    }
    const value = document.getElementById('compose_scrubber').value
    const the_url = frames[value]
    this.setState({
      compose_image: the_url,
      compose_image_title: the_url,
    }, this.setImageSize(the_url))
    this.updateMovieOffset(value)
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

  getMaxRange() {
    if (!this.props.movies || !this.props.movie_url) {
      return 1
    }
    const movie = this.props.movies[this.props.movie_url]
    const max_len = movie['frames'].length - 1
    return max_len
  }

  getSequence() {
    if (Object.keys(this.props.movies).includes('sequence')) {
      return this.props.movies['sequence']
    }
  }

  captureFrame() {
    this.props.addImageToMovie({
      url: this.state.compose_image,
      movie_url: 'sequence',
    })
  }

  gotoRedaction() {
    this.props.setGlobalStateVar('movie_url', 'sequence')
    const sequence = this.getSequence()
    this.props.setFramesetHash('1', sequence['framesets'])
    document.getElementById('image_panel_link').click()
  }

  buildCaptureButton() {
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.captureFrame()}
      >
        Capture
      </button>
    )
  }

  buildGotoRedactionButton() {
    const sequence_movie = this.getSequence()
    if (!sequence_movie || !sequence_movie['frames'].length) {
      return ''
    }
    return (
      <button
          className='btn btn-primary ml-2'
          onClick={() => this.gotoRedaction()}
      >
        Goto Redaction
      </button>
    )
  }

  buildWhenDoneLink() {
    if (this.state.compose_image === '') {
      return ''
    }
    if (this.props.whenDoneTarget) {
      return (
        <button
            className='btn btn-primary ml-2'
            onClick={() => this.props.gotoWhenDoneTarget()}
        >
          Goto Precision Learning
        </button>
      )
    }
  }

  buildNotLoadedMessage() {
    if (!this.props.movie_url) {
      return (
        <div>
          <div className='col-lg-9'>
            <div className='h1 mt-5 text-center'>
              movie not loaded
            </div>
            <div className='ml-5 mr-5'>
               <div className='h4'>
                 Your movie may still be unzipping or there may have been a problem
                 retrieving it.  To fetch a movie from secure files on your own: 
               </div>
               <ul>
                 <li>
                   Go to the Insights tab on the top of this page
                 </li>
                 <li>
                   If you see a new card in the Videos column on the left with the name of your movie, 
                   and you see a card in the Jobs column on the right which says 'split and hash threaded', 
                   and the job card has has a big label that says 'running', then your movie is still being split, 
                   if you go back to the Compose tab and wait, the movie will appear when it is ready
                 </li>
                 <li>
                   If you don't see the Movie and Job cards, then expand the file system section towards the bottom
                   of the page
                 </li>
                 <li>
                   In the 'Import from secure files' section, specify your recording Id and press Go
                 </li>
                 <li>
                   You will soon see a new card in the Videos column on the left.  Press the 'split' link on 
                   that card.  It may take a minute or two to split
                 </li>
                 <li>
                   Then return to this page by pressing the Compose tab on top
                 </li>
               </ul>
            </div>
          </div>
        </div>
      )
    }
  }

  buildViewingString() {
    if (!this.props.movie_url) {
      return ''
    }
    let movie_string = ''
    if (this.props.movie_url === 'sequence') {
      movie_string = 'viewing caputured image sequence'
    }
    movie_string =  ' viewing movie ' + this.props.movie_url.split('/').slice(-1)[0]
    return (
      <div className='d-inline ml-2'>
        {movie_string}
      </div>
    )
  }

  setMovie(movie_url) {
    this.props.setGlobalStateVar('movie_url', movie_url)
    const num_frames = this.props.movies[movie_url]['frames'].length
    this.setScrubberMax(num_frames)
    this.scrubberOnChange(this.props.movies[movie_url]['frames'])
  }

  buildViewDropdown() {
    if (!this.props.movie_url) {
      return ''
    }
    const movie_urls = []
    for (let i=0; i < Object.keys(this.props.movies).length; i++) {
      const movie_url = Object.keys(this.props.movies)[i]
      if (movie_url !== 'sequence') {
        movie_urls.push(movie_url)
      }
    }
    return (
      <div>
        <div className='d-inline ml-2'>
          View
        </div>
        <div className='d-inline ml-2'>
          <select
              name='selected_area_interior_or_exterior'
              value={this.props.movie_url}
              onChange={(event) => this.setMovie(event.target.value)}
          >
            <option value='sequence'>Sequence</option>
            {movie_urls.map((movie_url, index) => {                            
              const short_name = 'Movie ' + movie_url.split('/').slice(-1)[0]
              return (
                <option key={index} value={movie_url}>{short_name}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  render() {
    const not_loaded_message = this.buildNotLoadedMessage()
    const capture_button = this.buildCaptureButton()
    const goto_redaction_button = this.buildGotoRedactionButton()
    const when_done_link = this.buildWhenDoneLink()
    const max_range = this.getMaxRange()
    const viewing_string = this.buildViewingString()
    const view_dropdown = this.buildViewDropdown()
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

          <div id='compose_header' className='row position-relative' >
            <div className='col'>
              {not_loaded_message}
              <div
                  className='d-inline'
              >
                {this.state.movie_offset_string}
                {viewing_string}
                {view_dropdown}
              </div>
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
                    max={max_range}
                    defaultValue='0'
                    onChange={this.scrubberOnChange}
                />
              </div>
            </div>
          </div>

          <div 
              id='compose_movie_footer' 
              className='row position-relative mt-2'
              style={image_offset_style}
          >
            <div className='col' >
              {capture_button}
              {goto_redaction_button}
              {when_done_link}
            </div>
          </div>

          <div 
              id='sequence_area' 
              className='row position-relative'
              style={image_offset_style}
          >
            <SequencePanel
              sequence_movie={this.getSequence()}
              removeSequenceFrame={this.removeSequenceFrame}
              gotoSequenceFrame={this.gotoSequenceFrame}
              compose_image={this.state.compose_image}
            />
          </div>
         
        </div>
      </div>
    );
  }
}

class SequencePanel extends React.Component {
  render() {
    if (!this.props.sequence_movie) {
      return ''
    }
    const sequence_movie_frames = this.props.sequence_movie['frames']
    return (
      <div className='border-top mt-2'>
        <div className='h5'>
          sequence
        </div>
        <div id='sequence_card_wrapper'>
          {sequence_movie_frames.map((frame_url, index) => {
            return (
            <SequenceCard
              frame_url={frame_url}
              key={index}
              sequence_movie={this.props.sequence_movie}
              removeSequenceFrame={this.props.removeSequenceFrame}
              gotoSequenceFrame={this.props.gotoSequenceFrame}
              compose_image={this.props.compose_image}
            />
            )
          })}
        </div>
      </div>
    )
  }
}

class SequenceCard extends React.Component {
  getIsCurrentImageIndicator() {
    if (this.props.frame_url === this.props.compose_image) {
      return '*'
    }
    return ''
  }

  buildRemoveLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.removeSequenceFrame(this.props.frame_url)}
      >
        remove
      </button>
    )
  }

  buildGotoLink() {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.gotoSequenceFrame(this.props.frame_url)}
      >
        goto
      </button>
    )
  }

  render() {
    const is_current_indicator = this.getIsCurrentImageIndicator() 
    const remove_link = this.buildRemoveLink()
    const goto_link = this.buildGotoLink()
    return (
    <div>
      <div className='d-inline'>
        {this.props.frame_url}
      </div>
      <div className='d-inline ml-2'>
        {remove_link}
      </div>
      <div className='d-inline ml-2'>
        {goto_link}
      </div>
      <div className='d-inline ml-2'>
        {is_current_indicator}
      </div>
    </div>
    )
  }
}

export default ComposePanel;
