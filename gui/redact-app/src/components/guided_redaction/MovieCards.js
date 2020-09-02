import React from 'react'

class MovieCardList extends React.Component {
  buildMultiIdString() {
    let build_string = ''
    let mcw = document.getElementById('movie_card_wrapper')
    if (mcw) {
      const movie_cards = Array.from(mcw.children)
      movie_cards.forEach(el => {
        build_string += '#' + el.children[0].children[1].id + ','
      })
      build_string = build_string.substring(0, build_string.length-1)
    }
    return build_string
  }

  buildCollapseAllCardsLink() {
    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    const ids_to_collapse = this.buildMultiIdString() 
    return (
      <div
        className='d-inline'
      >
        <button
            style={style}
            className='btn btn-link'
            aria-expanded='false'
            data-target={ids_to_collapse}
            aria-controls={ids_to_collapse}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    )
  }

  buildSplitAndHashAllLink() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-link'
            onClick={() => this.props.submitInsightsJob('split_and_hash_threaded', this.props.campaign_movies)}
        >
        s&h all
        </button>
      </div>
    )
  }

  render() {
    let cacl = this.buildCollapseAllCardsLink()
    let split_and_hash_all_link = this.buildSplitAndHashAllLink() 
    return (
      <div>
        <div className='row'>
          <span className='h3 mr-1'>Videos</span>
          {split_and_hash_all_link}
          {cacl}
        </div>
        <div id='movie_card_wrapper'>
        {this.props.campaign_movies.map((value, index) => {
          return (
          <MovieCard
              key={index}
              setCurrentVideo={this.props.setCurrentVideo}
              active_movie_url={this.props.movie_url}
              this_cards_movie_url={value}
              movies={this.props.movies}
              submitInsightsJob={this.props.submitInsightsJob}
              setMovieNickname={this.props.setMovieNickname}
              setDraggedId={this.props.setDraggedId}
              index={index}
              tier_1_matches={this.props.tier_1_matches}
              tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
              getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
              getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
              setScrubberToIndex={this.props.setScrubberToIndex}
              insights_image={this.props.insights_image}
              setGlobalStateVar={this.props.setGlobalStateVar}
              displayInsightsMessage={this.props.displayInsightsMessage}
          />
          )
        })}
        </div>
      </div>
    )
  }
}

class MovieCard extends React.Component {
  get_filename(the_url) {
    const parts = the_url.split('/')
    return parts[parts.length-1]
  }

  getShortMovieData(this_cards_movie_url) {
    const mn_length = this.get_filename(this_cards_movie_url).length
    let short_movie_name = this.get_filename(this_cards_movie_url)
    if (!short_movie_name) {
      short_movie_name = this_cards_movie_url
    }
    if (short_movie_name.length > 12) {
      short_movie_name = this.get_filename(this_cards_movie_url).substring(0, 4) + '...' + 
        this.get_filename(this_cards_movie_url).substring(mn_length-7)
    }
    return short_movie_name
  }

  buildNicknameBlock(movie_url, movies) {
    let return_arr = []
    if (Object.keys(movies).includes(movie_url)) {
      let nickname = movies[movie_url]['nickname']
      if (!nickname) {
        nickname = this.getShortMovieData(movie_url)
      }
      return_arr.push(
        <input
            className='movie_card_nickname'
            key='1922'
            value={nickname}
            size='24'
            title={movie_url}
            onChange={(event) => this.props.setMovieNickname(movie_url, event.target.value)}
        /> 
      )
    }
    return return_arr
  }

  buildMakeActiveButton(this_cards_movie_url) {
    if (!Object.keys(this.props.movies).includes(this_cards_movie_url)) {
      return (
        <div className='text-white' >
          (not ready)
        </div>
      )
    }
    let make_active_button = ''
    if (Object.keys(this.props.movies).includes(this_cards_movie_url)) {
      make_active_button = (
        <button
            className='btn btn-link'
            onClick={() => this.props.setCurrentVideo(this_cards_movie_url)}
        >
        load
        </button>
      )
    }
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      make_active_button = (
        <button
            className='btn btn-link text-success'
            onClick={() => this.props.setCurrentVideo(this_cards_movie_url)}
        >
        active
        </button>
      )
    }
    return make_active_button
  }

  getFramesetsCountMessage(this_cards_movie_url) {
    let framesets_count_message = 'no framesets'
    if (Object.keys(this.props.movies).includes(this_cards_movie_url)) {
      let the_framesets = this.props.movies[this_cards_movie_url]['framesets']
      if (!the_framesets) {
        return ''
      }
      framesets_count_message = Object.keys(the_framesets).length.toString() + ' framesets'
    }
    return (
      <div>
        {framesets_count_message}
      </div>
    )
  }

  getMovieDimensions(movie_url, movies) {
    if (
        Object.keys(movies).includes(movie_url) && 
        Object.keys(movies[movie_url]).includes('frame_dimensions') && 
        movies[movie_url]['frame_dimensions'] && 
        movies[movie_url]['frame_dimensions'].length > 1
    ) {
      const dims = movies[movie_url]['frame_dimensions']
      let ts = dims[0].toString() + 'x' + dims[1].toString()
      ts += ' - ' + movies[movie_url]['frameset_discriminator']
      return (
        <div>
          {ts}
        </div>
      )
    }
    return ''
  }

  buildMovieHeader(movie, movie_body_id, nickname_block) {
    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    return (
      <div
        className='d-inline'
      >
        {nickname_block}
        <button
            style={style}
            className='btn btn-link'
            aria-expanded='false'
            data-target={'#'+movie_body_id}
            aria-controls={movie_body_id}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    )
  }

  buildQueueJobLink() {
    return (
      <button
          className='btn btn-link'
          onClick={() => this.props.submitInsightsJob('split_and_hash_threaded', this.props.this_cards_movie_url)}
      >
      split
      </button>
    )
  }

  getTier1MatchHashesForMovie(scanner_type, movie_url) {
    let hashes = []
    if (!this.props.tier_1_scanner_current_ids) {
      return []
    }
    const current_rule_id = this.props.tier_1_scanner_current_ids[scanner_type]
    if (!current_rule_id) {
      return []
    }
    if (!Object.keys(this.props.tier_1_matches).includes(scanner_type)) {
      return []
    }
    if (!Object.keys(this.props.tier_1_matches[scanner_type]).includes(current_rule_id)) {
      return []
    }
    const this_rule_matches = this.props.tier_1_matches[scanner_type][current_rule_id]
    if (!Object.keys(this_rule_matches).includes('movies') || 
        !Object.keys(this_rule_matches['movies']).includes(movie_url) ||
        !this_rule_matches['movies'][movie_url]) {
      return []
    }
    const scanner_matches_for_movie = this_rule_matches['movies'][movie_url]
    const frameset_hashes = Object.keys(scanner_matches_for_movie['framesets'])
    for (let i=0; i < frameset_hashes.length; i++) {
      if (Object.keys(scanner_matches_for_movie['framesets'][frameset_hashes[i]]).length > 0) {
        hashes.push(frameset_hashes[i])
      }
    }
    return hashes
  }

  setScrubberToNextTier1Hit(scanner_type) {
    const scanner_frameset_hashes = this.getTier1MatchHashesForMovie(scanner_type, this.props.this_cards_movie_url)
    let movie = this.props.movies[this.props.this_cards_movie_url]
    const movie_frameset_hashes = this.props.getFramesetHashesInOrder(movie)
    if (this.props.active_movie_url !== this.props.this_cards_movie_url) {
      this.props.setCurrentVideo(this.props.this_cards_movie_url) 
      let lowest_position = 99999
      let scanner_hash = ''
      let index = 99999
      for (let i=0; i < scanner_frameset_hashes.length; i++) {
        scanner_hash = scanner_frameset_hashes[i]
        index = movie_frameset_hashes.indexOf(scanner_hash)
        if (index < lowest_position) {
          lowest_position = index
        } 
      }
      setTimeout((() => {this.props.setScrubberToIndex(lowest_position)}), 1000)
    } else {
      const cur_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
      const cur_position = movie_frameset_hashes.indexOf(cur_hash)
      const remaining_hashes = movie_frameset_hashes.slice(cur_position+1)
      for (let i=0; i < remaining_hashes.length; i++) {
        if (scanner_frameset_hashes.includes(remaining_hashes[i])) {
          const new_index = cur_position + i + 1
          setTimeout((() => {this.props.setScrubberToIndex(new_index)}), 1000)
          return
        }
      }
      const first_index = movie_frameset_hashes.indexOf(scanner_frameset_hashes[0])
      setTimeout((() => {this.props.setScrubberToIndex(first_index)}), 1000)
    }
  }

  clearTier1Matches(scanner_type) {
    let deepCopyTier1Matches= JSON.parse(JSON.stringify(this.props.tier_1_matches))
    const current_scanner_id = this.props.tier_1_scanner_current_ids[scanner_type]
    delete deepCopyTier1Matches[scanner_type][current_scanner_id]
    this.props.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
    this.props.displayInsightsMessage(scanner_type+' matches have been removed')
  }

  getTier1MatchesString(scanner_type) {
    let count = this.getTier1MatchHashesForMovie(scanner_type, this.props.this_cards_movie_url).length
    if (!count) {
      return
    }
    let scanner_type_short = scanner_type
    if (scanner_type === 'template') {
      scanner_type_short = 'temp'
    } else if (scanner_type === 'selected_area') {
      scanner_type_short = 'sel ar'
    } else if (scanner_type === 'ocr_scene_analysis') {
      scanner_type_short = 'osa'
    }
    let matches_button = ''
    let clear_button = ''
    if (count > 0) {
      clear_button = (
        <button
          className='border-0 text-primary'
          onClick={() => this.clearTier1Matches(scanner_type)}
        >
          clr
        </button>
      )
      matches_button = (
        <button
          className='border-0 text-primary'
          onClick={() => this.setScrubberToNextTier1Hit(scanner_type)}
        >
          nxt
        </button>
      )
    }

    return (
      <div>
        {count.toString()} {scanner_type_short} matches
        {matches_button}
        {clear_button}
      </div>
    )
  }

  setScrubberToNextAreasToRedactHit() {
    let movie = this.props.movies[this.props.this_cards_movie_url]
    const movie_frameset_hashes = this.props.getFramesetHashesInOrder(movie)
    let hashes_with_areas_to_redact = []
    for (let i=0; i < movie_frameset_hashes.length; i++) {
      const frameset_hash = movie_frameset_hashes[i]
      if (Object.keys(movie['framesets'][frameset_hash]).includes('areas_to_redact')) {
        hashes_with_areas_to_redact.push(frameset_hash)
      }
    }
    if (this.props.active_movie_url !== this.props.this_cards_movie_url) {
      this.props.setCurrentVideo(this.props.this_cards_movie_url) 
      const index = movie_frameset_hashes.indexOf(hashes_with_areas_to_redact[0])
      setTimeout((() => {this.props.setScrubberToIndex(index)}), 1000)
    } else {
      const cur_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
      const cur_position = movie_frameset_hashes.indexOf(cur_hash)
      const remaining_hashes = movie_frameset_hashes.slice(cur_position+1)
      for (let i=0; i < remaining_hashes.length; i++) {
        if (hashes_with_areas_to_redact.includes(remaining_hashes[i])) {
          const new_index = cur_position + i + 1
          setTimeout((() => {this.props.setScrubberToIndex(new_index)}), 1000)
          return
        }
      }
      const first_index = movie_frameset_hashes.indexOf(hashes_with_areas_to_redact[0])
      setTimeout((() => {this.props.setScrubberToIndex(first_index)}), 1000)
    }
  }

  clearAreasToRedact() {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.props.movies))
    let movie = JSON.parse(JSON.stringify(this.props.movies[this.props.this_cards_movie_url]))
    for (let i=0; i < Object.keys(movie['framesets']).length; i++) {
      const frameset_hash = Object.keys(movie['framesets'])[i]
      if (Object.keys(movie['framesets'][frameset_hash]).includes('areas_to_redact')) {
        delete movie['framesets'][frameset_hash]['areas_to_redact']
      }
    }
    deepCopyMovies[this.props.this_cards_movie_url] = movie
    this.props.setGlobalStateVar('movies', deepCopyMovies)
    this.props.displayInsightsMessage('redaction areas have been removed')
  }

  getAreasToRedactString() {
    if (Object.keys(this.props.movies).includes(this.props.this_cards_movie_url)) {
      const movie = this.props.movies[this.props.this_cards_movie_url]
      let a2r_framesets_count = 0
      if (!Object.keys(movie).includes('framesets')) {
        return ''
      }
      for (let i=0; i < Object.keys(movie['framesets']).length; i++) {
        const frameset_hash = Object.keys(movie['framesets'])[i]
        if (Object.keys(movie['framesets'][frameset_hash]).includes('areas_to_redact')) {
          a2r_framesets_count += 1
        }
      }
      let matches_button = ''
      let clear_button = ''
      if (a2r_framesets_count > 0) {
        clear_button = (
          <button
            className='border-0 text-primary'
            onClick={() => this.clearAreasToRedact()}
          >
            clr
          </button>
        )
        matches_button = (
          <button
            className='border-0 text-primary'
            onClick={() => this.setScrubberToNextAreasToRedactHit()}
          >
            nxt
          </button>
        )
        return (
          <div>
            {a2r_framesets_count} redactions
            {matches_button}
            {clear_button}
          </div>
        )
      }
    }
    return ''
  }

  buildHasTimestampInfo() {
    if (Object.keys(this.props.movies).includes(this.props.this_cards_movie_url)) {
      const movie = this.props.movies[this.props.this_cards_movie_url]
      if (Object.keys(movie).includes('start_timestamp'))  {
        if (Object.keys(movie['start_timestamp']).length > 0) {
          return (
            <div>
              has timestamp
            </div>
          )
        } else {
          return (
            <div>
              no timestamp
            </div>
          )
        }
      }
    }
    return ''
  }

  showTelemetryFrame(movie_url, offset) {
    const the_movie = this.props.movies[movie_url]
    const the_image = the_movie['frames'][offset]
    const the_frameset = this.props.getFramesetHashForImageUrl(the_image, the_movie['framesets'])
    const movie_framesets = this.props.getFramesetHashesInOrder(the_movie)
    const image_frameset_index = movie_framesets.indexOf(the_frameset)
    this.props.setCurrentVideo(movie_url) 
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  buildHasTelemetryInfo() {
    if (!this.props.tier_1_scanner_current_ids) {
      return ''
    }
    if (Object.keys(this.props.tier_1_matches['telemetry']).includes(this.props.tier_1_scanner_current_ids['telemetry'])) {
      const tel_matches = this.props.tier_1_matches['telemetry'][this.props.tier_1_scanner_current_ids['telemetry']]
      if (Object.keys(tel_matches['movies']).includes(this.props.this_cards_movie_url)) {
        const offset = tel_matches['movies'][this.props.this_cards_movie_url][0]
        return (
          <div>
            <div className='d-inline'>
              has telemetry match 
            </div>
            <button
              className='border-0 text-primary'
              onClick={() => this.showTelemetryFrame(this.props.this_cards_movie_url, offset)}
            >
              show
            </button>
          </div>
        )
      } else {
        return (
          <div>
            <div className='d-inline'>
              no telemetry match 
            </div>
          </div>
        )
      }
    }
    return ''
  }

  buildVideoSourceObject() {
    if (this.props.this_cards_movie_url.includes('.mp4')) {
      return (
        <div>
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
      )
    } else {
      const this_movie = this.props.movies[this.props.this_cards_movie_url]
      const first_frame = this_movie['frames'][0]
      const the_style = {
        width: '100%',
      }
      return (
        <div>
          <img
            src={first_frame}
            alt={first_frame}
            style={the_style}
          />
        </div>
      )
    }
  }

  render() {
    let dd_style = {
      'fontSize': 'small',
    }

    let queue_job_button = this.buildQueueJobLink()
    const nickname_block = this.buildNicknameBlock(this.props.this_cards_movie_url, this.props.movies)
    const framesets_count_message = this.getFramesetsCountMessage(this.props.this_cards_movie_url)
    const make_active_button = this.buildMakeActiveButton(this.props.this_cards_movie_url)
    const template_matches_string = this.getTier1MatchesString('template')
    const ocr_matches_string = this.getTier1MatchesString('ocr')
    const ocr_scene_analysis_matches_string = this.getTier1MatchesString('ocr_scene_analysis')
    const selected_areas_string = this.getTier1MatchesString('selected_area')
    const areas_to_redact_string = this.getAreasToRedactString()
    const dims_string = this.getMovieDimensions(this.props.this_cards_movie_url, this.props.movies)
    let top_div_classname = "row mt-2 card"
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      top_div_classname = "row mt-2 card active_card"
    }
    const movie_body_id = 'movie_body_' + this.props.index
    const movie = this.props.movies[this.props.this_cards_movie_url]
    const movie_header = this.buildMovieHeader(movie, movie_body_id, nickname_block)
    const has_timestamp_info = this.buildHasTimestampInfo()
    const has_telemetry_info = this.buildHasTelemetryInfo()
    const video_source_object = this.buildVideoSourceObject()

    return (
      <div 
          className={top_div_classname}
          draggable='true'
          onDragStart={() => this.props.setDraggedId(this.props.this_cards_movie_url)}
          onDragOver={(event) => event.preventDefault()}
      >
        <div className='col'>
            <div className='row' id='movie_header'>
              {movie_header}
            </div>

            <div 
              id={movie_body_id}
              className='collapse show'
            >

              <div className='row'>
                {video_source_object}
              </div>

              <div className='row'>
                {make_active_button}
                {queue_job_button}
              </div>

              <div 
                  className='row pl-1'
                  style={dd_style}
              >
                <div className='col'>
                  <div className='row'>
                    {framesets_count_message}
                  </div>
                  <div className='row'>
                    {dims_string}
                  </div>
                  <div className='row'>
                    {template_matches_string}
                  </div>
                  <div className='row'>
                    {ocr_matches_string}
                  </div>
                  <div className='row'>
                    {ocr_scene_analysis_matches_string}
                  </div>
                  <div className='row'>
                    {selected_areas_string}
                  </div>
                  <div className='row'>
                    {has_timestamp_info}
                  </div>
                  <div className='row'>
                    {has_telemetry_info}
                  </div>
                  <div className='row'>
                    {areas_to_redact_string}
                  </div>
                </div>
              </div>

            </div>

        </div>
      </div>
    )
  }
}

export default MovieCardList;
