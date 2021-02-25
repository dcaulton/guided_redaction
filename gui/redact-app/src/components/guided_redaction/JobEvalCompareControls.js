import React from 'react';
import {
  getFileNameFromUrl
} from './redact_utils.js'

class JobEvalCompareControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      compare_single_mode_data: {},
    }
  }

  componentDidMount() {
    let compare_mode_data = {}
    for (let i=0; i < this.props.jrs_ids_to_compare.length; i++) {
      const jrs_id = this.props.jrs_ids_to_compare[i]
      compare_mode_data[i] = {
        state: 'summary',
        jrs_id: jrs_id,
        movie_url: '',
        frameset_hash: '',
        frameset_overlay_modes: {},
        hide_non_job_frames: false,
        show_all_false_overlays: false,
        hide_non_review_frames: false,
      }
    }
    this.setState({
        compare_single_mode_data: compare_mode_data,
    })
  }

  setShowAllFalse(panel_id, show_all_false_value) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    deepCopyCsmd[panel_id]['show_all_false_overlays'] = show_all_false_value

    const jrs = this.props.job_run_summaries[mode_data['jrs_id']]
    const movie_url = mode_data['movie_url']
    const source_movie = jrs['content']['source_movies'][movie_url]
    const frameset_hashes = this.props.getFramesetHashesInOrder(source_movie)

    let build_overlay_modes = {}
    if (show_all_false_value) {
      for (let i=0; i < frameset_hashes.length; i++) {
        const fsh = frameset_hashes[i]
        build_overlay_modes[fsh] = 'f_all'
      }
    }
    deepCopyCsmd[panel_id]['frameset_overlay_modes'] = build_overlay_modes

    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  buildSingleShowAllFalse(panel_id, job_run_summary) {
    if (
      !this.state.compare_single_mode_data ||
      Object.keys(this.state.compare_single_mode_data).length === 0
    ) {
      return 
    }
    const mode_data = this.state.compare_single_mode_data[panel_id]
    let checked_value = ''
    if (mode_data['show_all_false_overlays']) {
      checked_value = 'checked'
    }
    return (
      <div className='ml-3'>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={()=>{
              this.setShowAllFalse(panel_id, !mode_data['show_all_false_overlays'])
            }}
          />
        </div>
        <div className='d-inline'>
          Show all False for Every Frame
        </div>
      </div>
    )
  }

  buildSingleControls(panel_id, job_run_summary) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    if (mode_data['state'] !== 'frameset_list') {
      return ''
    }
    let job_checked_value = ''
    let job_new_value = true
    if (mode_data['hide_non_job_frames']) {
      job_checked_value = 'checked'
      job_new_value = false
    }
    const job_line = (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={job_checked_value}
            type='checkbox'
            onChange={()=>{this.setCompareSingleAttribute(panel_id, 'hide_non_job_frames', job_new_value)}}
          />
        </div>
        <div className='d-inline'>
          Hide Non Job Frames
        </div>
      </div>
    )

    let review_line = ''
    if (job_run_summary['summary_type'] === 'manual') {
      let review_checked_value = ''
      let review_new_value = true
      if (mode_data['hide_non_review_frames']) {
        review_checked_value = 'checked'
        review_new_value = false
      }
      review_line = (
        <div>
          <div className='d-inline'>
            <input
              className='ml-2 mr-2 mt-1'
              checked={review_checked_value}
              type='checkbox'
              onChange={()=>{this.setCompareSingleAttribute(panel_id, 'hide_non_review_frames', review_new_value)}}
            />
          </div>
          <div className='d-inline'>
            Hide Non Reviewed Frames
          </div>
        </div>
      )
    }

    return (
      <div className='col'>
        <div className='row'>
          <div className='col-6'>
            {job_line}
          </div>
          <div className='col-6'>
            {review_line}
          </div>
        </div>
      </div>
    )
  }

  setCompareSingleAttribute(panel_id, attribute_name, new_value) {
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    deepCopyCsmd[panel_id][attribute_name] = new_value
    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  setCompareSingleAttributeFramesetVar(panel_id, frameset_hash, attribute_name, new_value) {
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    deepCopyCsmd[panel_id][attribute_name][frameset_hash] = new_value
    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  buildSingleNav(panel_id) {
    let first_button = ''
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    if (mode_data['state'] === 'frameset_list') {
      first_button = (
        <button
          className='btn btn-primary'
          onClick={()=>{this.setCompareSingleAttribute(panel_id, 'state', 'summary')}}
        >
          Back to Summary
        </button>
      )
    }

    return (
      <div className='m-2'>
        {first_button}
      </div>
    )
  }

  buildSetOverlayModeButton(panel_id, frameset_hash, label, new_overlay_mode) {
    return (
      <button
        className='btn btn-link p-0 mr-1'
        onClick={()=>{this.setCompareSingleAttributeFramesetVar(panel_id, frameset_hash, 'frameset_overlay_modes', new_overlay_mode)}}
      >
        {label}
      </button>
    )
  }

  buildSingleFramesetStatsViewToggle(panel_id, counts, frameset_hash, overlay_mode) {
    if (Object.keys(counts).includes('not_used')) {
      return ''
    }
    let first_button = ''
    let second_button = ''
    let third_button = ''
    let fourth_button = ''
    let fifth_button = ''
    if (overlay_mode === 'none' || !overlay_mode) {
      first_button = (
        <div className='mr-1 font-weight-bold'>
          None
        </div>
      )
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 'f_pos') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = (
        <div className='mr-1 font-weight-bold'>
          F Pos
        </div>
      )
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 'f_neg') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = (
        <div className='mr-1 font-weight-bold'>
          F Neg
        </div>
      )
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 'f_all') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = (
        <div className='mr-1 font-weight-bold'>
          All False
        </div>
      )
      fifth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'T Pos', 't_pos')
    } else if (overlay_mode === 't_pos') {
      first_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'None', 'none')
      second_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Pos', 'f_pos')
      third_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'F Neg', 'f_neg')
      fourth_button = this.buildSetOverlayModeButton(panel_id, frameset_hash, 'All False', 'f_all')
      fifth_button = (
        <div className='mr-1 font-weight-bold'>
          T Pos
        </div>
      )
    }
    return (
      <div className='col'>
        <div className='row'>
          <div className='d-inline'>
            Show:
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {first_button}
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {second_button}
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {third_button}
          </div>
          <div className='d-inline m-1 p-0 border-right'>
            {fourth_button}
          </div>
          <div className='d-inline m-1 p-0'>
            {fifth_button}
          </div>
        </div>
      </div>
    )
  }

  buildSingleFramesetStatsRows(counts, frameset_stats) {
    let job_output_comment = ''
    if (Object.keys(counts).includes('not_used')) {
      job_output_comment = 'No job output'
    }
    let frameset_stats_pass_or_fail = 'pass'
    let frameset_stats_score = ''
    let frameset_stats_tpos = ''
    let frameset_stats_tneg = ''
    let frameset_stats_fpos = ''
    let frameset_stats_fneg = ''
    let frameset_stats_missed_item = ''
    if (frameset_stats) {
      frameset_stats_pass_or_fail = frameset_stats['pass_or_fail']
      frameset_stats_score = (
        <div className='row'>
          <div className='d-inline'>
            Score:
          </div>
          <div className='d-inline ml-2'>
            {frameset_stats['score']}
          </div>
        </div>
      )
      frameset_stats_tpos = (
        <div className='row'>
          <div className='d-inline'>
            True Positives:
          </div>
          <div className='d-inline ml-2'>
            {counts['t_pos']}
          </div>
        </div>

      )
      frameset_stats_tneg = (
        <div className='row'>
          <div className='d-inline'>
            True Negatives:
          </div>
          <div className='d-inline ml-2'>
            {counts['t_neg']}
          </div>
        </div>

      )
      frameset_stats_fpos = (
        <div className='row'>
          <div className='d-inline'>
            False Positives:
          </div>
          <div className='d-inline ml-2'>
            {counts['f_pos']}
          </div>
        </div>

      )
      frameset_stats_fneg = (
        <div className='row'>
          <div className='d-inline'>
            False Negatives:
          </div>
          <div className='d-inline ml-2'>
            {counts['f_neg']}
          </div>
        </div>
      )
      frameset_stats_missed_item = (
        <div className='row'>
          <div className='d-inline'>
            Missed Items:
          </div>
          <div className='d-inline ml-2'>
            {counts['missed_item_count']}
          </div>
        </div>
      )
    }
    return (
      <div className='col'>
        <div className='row'>
          <div className='font-italic'>
            {job_output_comment}
          </div>
        </div>

        <div className='row'>
          <div className='d-inline'>
            Pass or Fail:
          </div>
          <div className='d-inline ml-2'>
            {frameset_stats_pass_or_fail}
          </div>
        </div>

        {frameset_stats_score}
        {frameset_stats_tpos}
        {frameset_stats_tneg}
        {frameset_stats_fpos}
        {frameset_stats_fneg}
        {frameset_stats_missed_item}

      </div>
    )
  }

  buildOneFramesetsComments(fs_mode, movie_data, frameset_hash) {
    let frameset_comment_row = ''
    if (Object.keys(movie_data['framesets']).includes(frameset_hash)) {
      if (
        Object.keys(movie_data['framesets'][frameset_hash]).includes('comment') &&
        movie_data['framesets'][frameset_hash]['comment']
      ) {
        frameset_comment_row = (
          <div className='row alert alert-warning'>
            <div className='d-inline'>
              Frameset Comments:
            </div>
            <div className='d-inline ml-2'>
              {movie_data['framesets'][frameset_hash]['comment']}
            </div>
          </div>
        )
      }
    }
    return frameset_comment_row
  }

  buildSingleFramesetList(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    if (mode_data['state'] !== 'frameset_list') {
      return ''
    }
    const img_row_style = {
      position: 'relative',
    }
    const img_style = {
      width: '100%',
    }
    const overlay_img_style = {
      width: '100%',
      opacity: .4,
      position: 'absolute',
      top: 0, 
      left: 0,
    }
    const jrs = this.props.job_run_summaries[mode_data['jrs_id']]
    const movie_url = mode_data['movie_url']
    const movie_data = jrs['content']['movies'][movie_url]
    const source_movie = jrs['content']['source_movies'][movie_url]
    const movie_stats = jrs['content']['statistics']['movie_statistics'][movie_url]
    const frameset_hashes = this.props.getFramesetHashesInOrder(source_movie)
    return (
      <div className='col border-bottom pb-2 ml-2 mb-2'>
        {frameset_hashes.map((frameset_hash, index) => {
          let frameset_counts = {
            not_used: true,
          }
          const fs_mode = mode_data['frameset_overlay_modes'][frameset_hash]
          let overlay_image_url = ''
          if (Object.keys(movie_data['framesets']).includes(frameset_hash)) {
            overlay_image_url = movie_data['framesets'][frameset_hash]['maps'][fs_mode]
            frameset_counts = movie_data['framesets'][frameset_hash]['counts']
          }
          let frameset_comment_row = this.buildOneFramesetsComments(fs_mode, movie_data, frameset_hash)

          if (
            this.state.compare_single_mode_data[panel_id]['hide_non_job_frames'] &&
            !movie_data['framesets'][frameset_hash]['has_job_data']
          ) {
            return ''
          }
          if (
            this.state.compare_single_mode_data[panel_id]['hide_non_review_frames'] &&
            !movie_data['framesets'][frameset_hash]['was_reviewed']
          ) {
            return ''
          }

          const len_string = (index+1).toString() + '/' + frameset_hashes.length.toString()
          const name_string = frameset_hash + ' - ' + len_string
          const img_url = source_movie['framesets'][frameset_hash]['images'][0]

          const frameset_stats = movie_stats['framesets'][frameset_hash]
          const frameset_stats_rows = this.buildSingleFramesetStatsRows(frameset_counts, frameset_stats)
          const frameset_overlay_mode = mode_data['frameset_overlay_modes'][frameset_hash]
          const frameset_view_buttons = this.buildSingleFramesetStatsViewToggle(
            panel_id, frameset_counts, frameset_hash, frameset_overlay_mode
          )
          return (
            <div key={index} className='col border-bottom pb-4 mb-4'>
              <div className='row font-weight-bold'>
                {name_string}
              </div>

              <div className='row'>
                {frameset_stats_rows}
              </div>

              {frameset_comment_row}

              <div className='row'>
                {frameset_view_buttons}
              </div>

              <div 
                style={img_row_style} 
                className='row'
              >
                <img 
                  style={img_style}
                  src={img_url}
                  alt={img_url}
                />
                <img 
                  style={overlay_img_style}
                  src={overlay_image_url}
                  alt={overlay_image_url}
                />
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  setCompareMultipleAttributes(panel_id, input_hash) {
    let deepCopyCsmd = JSON.parse(JSON.stringify(this.state.compare_single_mode_data))
    for (let i=0; i < Object.keys(input_hash).length; i++) {

      const key_name = Object.keys(input_hash)[i]
      deepCopyCsmd[panel_id][key_name] = input_hash[key_name]
    }
    this.setState({
      compare_single_mode_data: deepCopyCsmd,
    })
  }

  setCompareSingleFramesetList(panel_id, movie_url) {
    this.setCompareMultipleAttributes(
      panel_id, 
      {
        'state': 'frameset_list',
        'movie_url': movie_url,
        'frameset_hash': {},
        'frameset_overlay_modes': {},
      }
    )
  }

  getMovieUrlForMovieName(jrs, movie_name) {
    if (!Object.keys(jrs).includes('content')) {
      return ''
    }
    for (let i=0; i < Object.keys(jrs.content['movies']).length; i++) {
      const movie_url = Object.keys(jrs.content['movies'])[i]
      if (movie_url.includes(movie_name)) {
        return movie_url
      }
    }
  }

  buildSingleMovieList(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    if (mode_data['state'] !== 'summary') {
      return ''
    }
    const jrs = this.props.job_run_summaries[mode_data['jrs_id']]
    return (
      <div className='col'>
        <div className='row font-weight-bold'>
          Movies:
        </div>
        <div className='row'>
          <table className='table table-striped'>
            <thead>
              <tr>
                <td>name</td>
                <td># job frames</td>
                <td># review frames</td>
              </tr>
            </thead>
            <tbody>
              {jrs.movie_names.map((movie_name, index) => {
                const movie_url = this.getMovieUrlForMovieName(jrs, movie_name)
                let num_job_frames = 0
                let num_review_frames = 0
                if (Object.keys(jrs).includes('content')) {
                  const jrs_movie_data = jrs['content']['movies'][movie_url]
                  for (let i=0; i < Object.keys(jrs_movie_data['framesets']).length; i++) {
                    const fsh = Object.keys(jrs_movie_data['framesets'])[i]
                    if (jrs_movie_data['framesets'][fsh]['has_job_data']) {
                      num_job_frames += 1
                    }
                    if (jrs_movie_data['framesets'][fsh]['was_reviewed']) {
                      num_review_frames += 1
                    }
                  }
                }
                return (
                  <tr key={index}>
                    <td>
                      <button
                        className='btn btn-link'
                        onClick={()=>{this.setCompareSingleFramesetList(panel_id, movie_url)}}
                      >
                        {movie_name}
                      </button>
                    </td>
                    <td>
                      {num_job_frames}
                    </td>
                    <td>
                      {num_review_frames}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  buildSingleMovieSummary(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    if (mode_data['state'] !== 'frameset_list') {
      return ''
    }
    const jrs = this.props.job_run_summaries[mode_data['jrs_id']]
    const movie_url = mode_data['movie_url']
    const movie_data = jrs['content']['movies'][movie_url]
    const movie_stats = jrs['content']['statistics']['movie_statistics'][movie_url]
    let movie_comment_row = ''
    if (Object.keys(movie_data).includes('comment') && movie_data['comment']) {
      movie_comment_row = (
        <div className='row alert alert-warning'>
          <div className='d-inline'>
            Movie Comments:
          </div>
          <div className='d-inline ml-2'>
            {movie_data['comment']}
          </div>
        </div>
      )
    }
    return (
      <div className='col'>
        <div className='row'>
          <div className='col-6'>
            <div className='d-inline'>
              Pass / Fail
            </div>
            <div className='d-inline ml-2'>
              {movie_stats['pass_or_fail']}
            </div>
          </div>
          <div className='col-6'>
            <div className='d-inline'>
              Movie Score:
            </div>
            <div className='d-inline ml-2'>
              {movie_stats['score']}
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col'>
          <div className='d-inline'>
            Max / Min Frameset Scores :
          </div>
          <div className='d-inline ml-2'>
            {movie_stats['max_frameset_score']} / {movie_stats['min_frameset_score']} 
          </div>
          </div>
        </div>

        {movie_comment_row} 

      </div>
    )
  }

  buildSingleJobSummary(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    if (mode_data['state'] !== 'summary') {
      return ''
    }
    const jrs = this.props.job_run_summaries[mode_data['jrs_id']]

    let notes_row = ''
    if (
      Object.keys(jrs).includes('content') &&
      Object.keys(jrs['content']).includes('job_notes')
    ) {
      notes_row = (
        <div className='row alert alert-warning'>
          Job Comments: {jrs['content']['job_notes']}
        </div>
      )
    }

    let run_time_row = ''
    if (
      Object.keys(jrs).includes('content') &&
      Object.keys(jrs['content']).includes('statistics') &&
      Object.keys(jrs['content']['statistics']).includes('wall_clock_run_time')
    ) {
      run_time_row = (
        <div className='row'>
          wall clock run time: {jrs['content']['statistics']['wall_clock_run_time']}
        </div>
      )
    }


    return (
      <div className='col'>
        <div className='row'>
          score: {jrs.score}
        </div>
        <div className='row'>
          last updated: {jrs.updated_on}
        </div>
        {run_time_row}
        {notes_row}
      </div>
    )
  }

  buildSingleTitle(panel_id) {
    const mode_data = this.state.compare_single_mode_data[panel_id]
    if (!mode_data) { return }
    const jrs = this.props.job_run_summaries[mode_data['jrs_id']]
    let first_line = 'Overall Summary for Job ' + jrs.job_id
    if (mode_data['state'] === 'frameset_list') {
      first_line = 'Listing Framesets for Job id: ' + jrs.job_id
    }
    const second_line = 'Job Run Summary id: ' + jrs.id
    let third_line = ''
    if (mode_data['state'] === 'frameset_list') {
      const movie_url = mode_data['movie_url']
      const movie_name = getFileNameFromUrl(movie_url)
      third_line = 'Movie ' + movie_name
    }
    return (
      <div className='row ml-2'>
        <div className='col'>
          <div className='row font-weight-bold'>
            {first_line}
          </div>
          <div className='row font-weight-bold'>
            {second_line}
          </div>
          <div className='row font-weight-bold'>
            {third_line}
          </div>
        </div>
      </div>
    )
  }
  buildComparePanelSingle(job_run_summary_id, panel_id) {
    const jrs = this.props.job_run_summaries[job_run_summary_id]
    const title_section = this.buildSingleTitle(panel_id)
    const job_summary_section = this.buildSingleJobSummary(panel_id)
    const movie_summary_section = this.buildSingleMovieSummary(panel_id)
    const movie_section = this.buildSingleMovieList(panel_id)
    const frameset_section = this.buildSingleFramesetList(panel_id)
    const nav_section = this.buildSingleNav(panel_id)
    const controls_section = this.buildSingleControls(panel_id, jrs)
    const show_all_false = this.buildSingleShowAllFalse(panel_id, jrs)
    const height_px_string = (window.innerHeight * .75).toString() + 'px'
    const wrapper_style = {
      overflow: 'scroll',
      height: height_px_string,
    }
    return (
      <div
        className='row'
      >
        <div className='col'>
          <div className='row'>
            {nav_section}
          </div>
          <div className='row'>
            {title_section}
          </div>
          <div className='row'>
            {controls_section}
          </div>
          <div className='row'>
            {show_all_false}
          </div>
          <div className='row'>
            {job_summary_section}
          </div>
          <div className='row'>
            {movie_summary_section}
          </div>
          <div className='row mt-2 border-bottom'>
            {movie_section}
          </div>

          <div style={wrapper_style} className='row'>
            {frameset_section}
          </div>
        </div>
      </div>
    )
  }

  render() {
    let outer_col_class = 'col'
    if (this.props.jrs_ids_to_compare.length > 4) {
      return 'too many columns selected'
    } else if (this.props.jrs_ids_to_compare.length === 4) {
      outer_col_class = 'col-3'
    } else if (this.props.jrs_ids_to_compare.length === 3) {
      outer_col_class = 'col-4'
    } else if (this.props.jrs_ids_to_compare.length === 2) {
      outer_col_class = 'col-6'
    } else if (this.props.jrs_ids_to_compare.length === 1) {
      outer_col_class = 'col-12'
    }

    return (
      <div className='col'>
        <div className='row'>
          {this.props.jrs_ids_to_compare.map((jrs_id, index) => {
            if (index < this.props.jrs_ids_to_compare.length - 1) {
              outer_col_class += ' border-right'
            }
            const single_col_contents = this.buildComparePanelSingle(jrs_id, index)
            return (
              <div 
                key={index}
                className={outer_col_class}
              >
                {single_col_contents}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

}

export default JobEvalCompareControls;
