import React from 'react';
import TemplateControls from './TemplateControls'
import AnnotationControls from './AnnotationControls'
import TelemetryControls from './TelemetryControls'
import SelectedAreaControls from './SelectedAreaControls'
import OcrControls from './OcrControls'
import DiffControls from './DiffControls'
import MovieSetsControls from './MovieSetsControls'
import ResultsControls from './ResultsControls'
import FilesystemControls from './FilesystemControls'
import SessionControls from './SessionControls'

class BottomInsightsControls extends React.Component {

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
          handleSetMode={this.props.handleSetMode}
          clearCurrentTemplateAnchor={this.props.clearCurrentTemplateAnchor}
          clearCurrentTemplateMaskZones={this.props.clearCurrentTemplateMaskZones}
          submitInsightsJob={this.props.submitInsightsJob}
          clearTemplateMatches={this.props.clearTemplateMatches}
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          setCurrentTemplateId={this.props.setCurrentTemplateId}
          saveTemplate={this.props.saveTemplate}
          deleteTemplate={this.props.deleteTemplate}
          cropImage={this.props.cropImage}
          movie_sets={this.props.movie_sets}
          showTemplates={this.props.showTemplates}
          toggleShowTemplates={this.props.toggleShowTemplates}
        />

        <SelectedAreaControls
          handleSetMode={this.props.handleSetMode}
          getCurrentTemplateAnchorNames={this.props.getCurrentTemplateAnchorNames}
          clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
          showSelectedArea={this.props.showSelectedArea}
          toggleShowSelectedArea={this.props.toggleShowSelectedArea}
        />

        <AnnotationControls
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          saveAnnotation={this.props.saveAnnotation}
          deleteAnnotation={this.props.deleteAnnotation}
          annotations={this.props.annotations}
          handleSetMode={this.props.handleSetMode}
          setKeyDownCallback={this.props.setKeyDownCallback}
          getAnnotations={this.props.getAnnotations}
          showAnnotate={this.props.showAnnotate}
          toggleShowAnnotate={this.props.toggleShowAnnotate}
        />

        <TelemetryControls
          showTelemetry={this.props.showTelemetry}
          toggleShowTelemetry={this.props.toggleShowTelemetry}
        />

        <DiffControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          showDiffs={this.props.showDiffs}
          toggleShowDiffs={this.props.toggleShowDiffs}
          movie_sets={this.props.movie_sets}
          submitInsightsJob={this.props.submitInsightsJob}
          blinkDiff={this.props.blinkDiff}
          setImageTypeToDisplay={this.props.setImageTypeToDisplay}
          imageTypeToDisplay={this.props.imageTypeToDisplay}
        />

        <OcrControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          showOcr={this.props.showOcr}
          toggleShowOcr={this.props.toggleShowOcr}
        />

        <MovieSetsControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          movie_sets={this.props.movie_sets}
          setMovieSets={this.props.setMovieSets}
          draggedId={this.props.draggedId}
          showMovieSets={this.props.showMovieSets}
          toggleShowMovieSets={this.props.toggleShowMovieSets}
        />

        <ResultsControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          showResults={this.props.showResults}
          toggleShowResults={this.props.toggleShowResults}
        />

        <FilesystemControls
          showFilesystem={this.props.showFilesystem}
          toggleShowFilesystem={this.props.toggleShowFilesystem}
          files={this.props.files}
          getFiles={this.props.getFiles}
          deleteFile={this.props.deleteFile}
          displayInsightsMessage={this.props.displayInsightsMessage}
        />

        <SessionControls
          current_workbook_name={this.props.current_workbook_name}
          saveWorkbook={this.props.saveWorkbook}
          saveWorkbookName={this.props.saveWorkbookName}
          playSound={this.props.playSound}
          togglePlaySound={this.props.togglePlaySound}
          displayInsightsMessage={this.props.displayInsightsMessage}
          callPing={this.props.callPing}
          workbooks={this.props.workbooks}
          deleteWorkbook={this.props.deleteWorkbook}
          loadWorkbook={this.props.loadWorkbook}
          showTemplates={this.props.showTemplates}
          showSelectedArea={this.props.showSelectedArea}
          showMovieSets={this.props.showMovieSets}
          showResults={this.props.showResults}
          showAnnotate={this.props.showAnnotate}
          showTelemetry={this.props.showTelemetry}
          showFilesystem={this.props.showFilesystem}
          showOcr={this.props.showOcr}
          showDiffs={this.props.showDiffs}
          toggleShowTemplates={this.props.toggleShowTemplates}
          toggleShowSelectedArea={this.props.toggleShowSelectedArea}
          toggleShowMovieSets={this.props.toggleShowMovieSets}
          toggleShowResults={this.props.toggleShowResults}
          toggleShowAnnotate={this.props.toggleShowAnnotate}
          toggleShowTelemetry={this.props.toggleShowTelemetry}
          toggleShowFilesystem={this.props.toggleShowFilesystem}
          toggleShowOcr={this.props.toggleShowOcr}
          toggleShowDiffs={this.props.toggleShowDiffs}
          setFramesetDiscriminator={this.props.setFramesetDiscriminator}
          campaign_movies={this.props.campaign_movies}
          setCampaignMovies={this.props.setCampaignMovies}
          updateGlobalState={this.props.updateGlobalState}
          whenDoneTarget={this.props.whenDoneTarget}
          setWhenDoneTarget={this.props.setWhenDoneTarget}
          frameset_discriminator={this.props.frameset_discriminator}
        />

      </div>
    )
  }
}

export default BottomInsightsControls;
