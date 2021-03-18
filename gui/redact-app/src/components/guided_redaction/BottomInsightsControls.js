import React from 'react';
import TemplateControls from './TemplateControls'
import DataSifterControls from './DataSifterControls'
import OcrControls from './OcrControls'
import RedactControls from './RedactControls'
import ZipControls from './ZipControls'
import ResultsControls from './ResultsControls'
import FilesystemControls from './FilesystemControls'
import PipelineControls from './PipelineControls'
import SessionControls from './SessionControls'
import HogControls from './HogControls'
import SelectedAreaControls from './SelectedAreaControls'
import MeshMatchControls from './MeshMatchControls'
import SelectionGrowerControls from './SelectionGrowerControls'
import TelemetryControls from './TelemetryControls'
import OcrSceneAnalysisControls from './OcrSceneAnalysisControls'
import ImportExportControls from './ImportExportControls'
import SetToolsControls from './SetToolsControls'

class BottomInsightsControls extends React.Component {

  constructor(props) {
    super(props)
    this.buildMovieMetadata=this.buildMovieMetadata.bind(this)
    this.buildTier1RunOptions=this.buildTier1RunOptions.bind(this)
  }

  buildMovieMetadata(movie_url='') {
    if (!movie_url) {
      movie_url = this.props.movie_url
    }
    let build_movies = {}
    build_movies[movie_url] = this.props.movies[movie_url]
    return {
      movies: build_movies,
      tier_1_matches: this.props.tier_1_matches,
      templates: this.props.tier_1_scanners['template'],
      selected_area_metas: this.props.tier_1_scanners['selected_area'],
    }
  }

  buildTier1RunOptions(scanner_type, insights_job_name) {
    const tier_1_match_keys = Object.keys(this.props.tier_1_matches[scanner_type])
    if (tier_1_match_keys.length === 0) {
      return ''
    }

    const scanner_inventory = this.props.tier_1_scanners[scanner_type]
    return (
      <div>
        {tier_1_match_keys.map((value, index) => {
          let detail_line = 'Frames matched by ' + scanner_type + ' id ' + value
          if (Object.keys(scanner_inventory).includes(value)) {
            let record =  scanner_inventory[value]
            if (Object.keys(record).includes('name')) {
              detail_line = 'Frames matched by ' + scanner_type + ' ' + record['name']
            }
          }
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.props.submitInsightsJob(insights_job_name, value)}
            >
              {detail_line}
            </button>
          )
        })}
      </div>
    )
  }

  render() {
    let bottom_y = 110
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
    }
    const controls_style = {
      top: bottom_y,
    }

    return (
      <div 
          id='bottom_insights_controls' 
          style={controls_style}
      >

        <TemplateControls 
          setGlobalStateVar={this.props.setGlobalStateVar}
          handleSetMode={this.props.handleSetMode}
          submitInsightsJob={this.props.submitInsightsJob}
          displayInsightsMessage={this.props.displayInsightsMessage}
          cropImage={this.props.cropImage}
          buildTier1RunOptions={this.buildTier1RunOptions}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          addInsightsCallback={this.props.addInsightsCallback}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
          clicked_coords={this.props.clicked_coords}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
        />

        <DataSifterControls 
          setGlobalStateVar={this.props.setGlobalStateVar}
          handleSetMode={this.props.handleSetMode}
          displayInsightsMessage={this.props.displayInsightsMessage}
          buildTier1RunOptions={this.buildTier1RunOptions}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          addInsightsCallback={this.props.addInsightsCallback}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
          clicked_coords={this.props.clicked_coords}
          movies={this.props.movies}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
          submitInsightsJob={this.props.submitInsightsJob}
          jobs={this.props.jobs}
        />

        <HogControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          clicked_coords={this.props.clicked_coords}
          addInsightsCallback={this.props.addInsightsCallback}
          insights_image={this.props.insights_image}
          movies={this.props.movies}
          movie_url={this.props.movie_url}
          handleSetMode={this.props.handleSetMode}
          cropImage={this.props.cropImage}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          setScrubberToIndex={this.props.setScrubberToIndex}
          setCurrentVideo={this.props.setCurrentVideo}
        />

        <SelectedAreaControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          buildTier1RunOptions={this.buildTier1RunOptions}
          handleSetMode={this.props.handleSetMode}
          insights_image={this.props.insights_image}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          movie_url={this.props.movie_url}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
        />

        <MeshMatchControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          buildTier1RunOptions={this.buildTier1RunOptions}
          handleSetMode={this.props.handleSetMode}
          insights_image={this.props.insights_image}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          movie_url={this.props.movie_url}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
        />

        <SelectionGrowerControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          buildTier1RunOptions={this.buildTier1RunOptions}
          handleSetMode={this.props.handleSetMode}
          insights_image={this.props.insights_image}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          movie_url={this.props.movie_url}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
          jobs={this.props.jobs}
          getColorAtPixel={this.props.getColorAtPixel}
          getColorsInZone={this.props.getColorsInZone}
        />

        <OcrControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          handleSetMode={this.props.handleSetMode}
          clicked_coords={this.props.clicked_coords}
          buildTier1RunOptions={this.buildTier1RunOptions}
          setGlobalStateVar={this.props.setGlobalStateVar}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          importScanner={this.props.importScanner}
          deleteScanner={this.props.deleteScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          tier_1_matches={this.props.tier_1_matches}
          jobs={this.props.jobs}
        />

        <TelemetryControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          telemetry_data={this.props.telemetry_data}
          setTelemetryData={this.props.setTelemetryData}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
        />

        <OcrSceneAnalysisControls
          buildTier1RunOptions={this.buildTier1RunOptions}
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          app_codebooks={this.props.app_codebooks}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
          current_ids={this.props.current_ids}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          jobs={this.props.jobs}
        />

        <PipelineControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          pipelines={this.props.pipelines}
          current_ids={this.props.current_ids}
          getPipelines={this.props.getPipelines}
          dispatchPipeline={this.props.dispatchPipeline}
          deletePipeline={this.props.deletePipeline}
          displayInsightsMessage={this.props.displayInsightsMessage}
          savePipelineToDatabase={this.props.savePipelineToDatabase}
          setGlobalStateVar={this.props.setGlobalStateVar}
          movies={this.props.movies}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_matches={this.props.tier_1_matches}
          redact_rules={this.props.redact_rules}
        />

        <RedactControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          redact_rules={this.props.redact_rules}
          current_ids={this.props.current_ids}
          movies={this.props.movies}
          setGlobalStateVar={this.props.setGlobalStateVar}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importRedactRule={this.props.importRedactRule}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_matches={this.props.tier_1_matches}
          jobs={this.props.jobs}
        />

        <ZipControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
        />

        <ResultsControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          jobs={this.props.jobs}
          results={this.props.results}
          setScrubberToIndex={this.props.setScrubberToIndex}
          movies={this.props.movies}
          movie_url={this.props.movie_url}
          setCurrentVideo={this.props.setCurrentVideo}
          setGlobalStateVar={this.props.setGlobalStateVar}
        />

        <SetToolsControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          displayInsightsMessage={this.props.displayInsightsMessage}
          jobs={this.props.jobs}
        />

        <FilesystemControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          files={this.props.files}
          getFiles={this.props.getFiles}
          deleteFile={this.props.deleteFile}
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          buildMovieMetadata={this.buildMovieMetadata}
          dispatchFetchSplitAndHash={this.props.dispatchFetchSplitAndHash}
        />

        <ImportExportControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          jobs={this.props.jobs}
          pipelines={this.props.pipelines}
          movies={this.props.movies}
          runExportTask={this.props.runExportTask}
          postImportArchiveCall={this.props.postImportArchiveCall}
          setGlobalStateVar={this.props.setGlobalStateVar}
        />

        <SessionControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          toggleGlobalStateVar={this.props.toggleGlobalStateVar}
          current_workbook_name={this.props.current_workbook_name}
          current_workbook_id={this.props.current_workbook_id}
          saveWorkbook={this.props.saveWorkbook}
          saveWorkbookName={this.props.saveWorkbookName}
          displayInsightsMessage={this.props.displayInsightsMessage}
          callPing={this.props.callPing}
          callGetVersion={this.props.callGetVersion}
          workbooks={this.props.workbooks}
          deleteWorkbook={this.props.deleteWorkbook}
          loadWorkbook={this.props.loadWorkbook}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          campaign_movies={this.props.campaign_movies}
          setCampaignMovies={this.props.setCampaignMovies}
          updateGlobalState={this.props.updateGlobalState}
          whenDoneTarget={this.props.whenDoneTarget}
          frameset_discriminator={this.props.frameset_discriminator}
          preserveAllJobs={this.props.preserveAllJobs}
          submitInsightsJob={this.props.submitInsightsJob}
          preserve_movie_audio={this.props.preserve_movie_audio}
          getPipelines={this.props.getPipelines}
          impersonateUser={this.props.impersonateUser}
          cv_workers={this.props.cv_workers}
          queryCvWorker={this.props.queryCvWorker}
          deleteOldJobs={this.props.deleteOldJobs}
          job_polling_interval_seconds={this.props.job_polling_interval_seconds}
          getJobResultData={this.props.getJobResultData}
          detectScreens={this.props.detectScreens}
          insights_image={this.props.insights_image}
          loadInsightsJobResults={this.props.loadInsightsJobResults}
        />

      </div>
    )
  }
}

export default BottomInsightsControls;
