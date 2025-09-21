// main.cpp
#include <QApplication>
#include <QDirIterator>
#include <QGridLayout>
#include <QLabel>
#include <QToolButton>
#include <QScrollArea>
#include <QWidget>
#include <QFileInfo>
#include <QFileDialog>
#include <QPushButton>
#include <QLineEdit>
#include <QSettings>
#include <QTemporaryDir>
#include <QVector>
#include <QTimer>
#include <QProcess>
#include <QtConcurrent>
#include <QFuture>
#include <QFutureWatcher>
#include <QPixmap>
#include <QDebug>
#include <QDateTime>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QRandomGenerator>
#include <algorithm>
#include <QDesktopServices>
#include <QUrl>
#include <QStyle>
#include <QStackedLayout>
#include <QMenu>

// ---------------- Logging ----------------
static QFile logFile("draftys-videobrowser.log");
static void logMessage(const QString &msg) {
    if(!logFile.isOpen()) logFile.open(QIODevice::Append | QIODevice::Text);
    QTextStream out(&logFile);
    QString timeStamp = QDateTime::currentDateTime().toString("yyyy-MM-dd HH:mm:ss");
    out << "[" << timeStamp << "] " << msg << "\n";
    out.flush();
    qDebug() << msg;
}

// ---------------- Helpers ----------------
static QString fileId(const QString &path) {
    QFileInfo fi(path);
    QString c = fi.canonicalFilePath();
    return c.isEmpty() ? fi.absoluteFilePath() : c;
}

QString extractThumbnail(const QString &videoPath, const QString &thumbPath) {
    QProcess probe;
    probe.start("ffprobe", {"-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1", videoPath});
    probe.waitForFinished();
    double duration = probe.readAllStandardOutput().trimmed().toDouble();
    if(duration <= 0) duration = 1.0;
    double midpoint = duration/2.0;

    QProcess ffmpeg;
    ffmpeg.start("ffmpeg", {"-y","-ss",QString::number(midpoint),"-i",videoPath,"-vframes","1",thumbPath});
    ffmpeg.waitForFinished(1000);
    return thumbPath;
}

QString formatDuration(double seconds) {
    int total = static_cast<int>(seconds);
    int h = total/3600;
    int m = (total%3600)/60;
    int s = total%60;
    if(h>0) return QString("%1:%2:%3").arg(h,2,10,QLatin1Char('0')).arg(m,2,10,QLatin1Char('0')).arg(s,2,10,QLatin1Char('0'));
    else return QString("%1:%2").arg(m,2,10,QLatin1Char('0')).arg(s,2,10,QLatin1Char('0'));
}

double getVideoDuration(const QString &filePath) {
    QProcess probe;
    probe.start("ffprobe", {"-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1", filePath});
    probe.waitForFinished();
    return probe.readAllStandardOutput().trimmed().toDouble();
}

// ---------------- Video Card ----------------
struct VideoCard {
    QString filePath;
    QString title;
    QString channel;
    QToolButton* button;
    QLabel* pinLabel = nullptr;
    QLabel* thumbLabel = nullptr;
    bool pinned = false;

    QPixmap customThumb;
    QString customThumbPath;
    QString customThumbOverride; // per-video custom override

    QFutureWatcher<void>* thumbWatcher = nullptr;

    QVector<QPixmap> hoverFrames;
    QTimer* hoverTimer = nullptr;
    int currentFrameIndex = 0;
    bool canceled = false;
};

// ---------------- Hover Filter ----------------
class HoverFilter : public QObject {
    Q_OBJECT
public:
    HoverFilter(VideoCard* v) : video(v) {}
protected:
    bool eventFilter(QObject* obj, QEvent* event) override {
        if(event->type()==QEvent::Enter){
            if(video->hoverFrames.isEmpty()) return false;
            video->currentFrameIndex = 0;
            if(!video->hoverTimer){
                video->hoverTimer = new QTimer(video->button);
                QObject::connect(video->hoverTimer,&QTimer::timeout,[this](){
                    if(video->canceled || video->hoverFrames.isEmpty()) { video->hoverTimer->stop(); return; }
                    video->thumbLabel->setPixmap(video->hoverFrames[video->currentFrameIndex]);
                    video->currentFrameIndex = (video->currentFrameIndex + 1) % video->hoverFrames.size();
                });
            }
            video->hoverTimer->start(300);
        } else if(event->type()==QEvent::Leave){
            if(video->hoverTimer) video->hoverTimer->stop();
            video->thumbLabel->setPixmap(video->customThumb);
        }
        return false;
    }
private:
    VideoCard* video;
};

// ---------------- Build Video Cards ----------------
QVector<VideoCard*> buildVideoCards(const QString &basePath, QTemporaryDir &tempDir){
    QVector<VideoCard*> videos;
    QPixmap placeholder(320,180);
    placeholder.fill(Qt::darkGray);

    QDirIterator it(basePath, {"*.mp4","*.mkv","*.avi","*.mov"}, QDir::Files, QDirIterator::Subdirectories);
    while(it.hasNext()){
        QString filePath = it.next();
        QFileInfo info(filePath);
        QString channel = QFileInfo(info.dir().path()).fileName();
        QString videoTitle = info.completeBaseName();

        // Modern Card UI
        QFrame* cardFrame = new QFrame;
        cardFrame->setFixedSize(340, 245);
        cardFrame->setStyleSheet(R"(
            QFrame {
                background: #23272e;
                border-radius: 8px;
                border: 1px solid #444;
                box-shadow: 0px 4px 16px rgba(0,0,0,0.18);
            }
            QFrame:hover {
                border: 2px solid #0078d7;
                background: #282c34;
            }
        )");

        QVBoxLayout* cardLayout = new QVBoxLayout(cardFrame);
        cardLayout->setSpacing(8);
        cardLayout->setContentsMargins(12,12,12,12);

        QWidget* thumbContainer = new QWidget;
        thumbContainer->setFixedSize(320,180);
        QStackedLayout* thumbStack = new QStackedLayout(thumbContainer);
        thumbStack->setStackingMode(QStackedLayout::StackAll);

        QLabel* thumbLabel = new QLabel;
        thumbLabel->setAlignment(Qt::AlignCenter);
        thumbLabel->setPixmap(placeholder);
        thumbLabel->setFixedSize(320,180);

        // ---- Modern Duration Pill ----
        QLabel* durationLabel = new QLabel("00:00");
        durationLabel->setStyleSheet(R"(
            background-color: rgba(0,0,0,200);
            color: white;
            padding: 2px 10px;
            font-size: 12px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,80);
        )");
        durationLabel->setAlignment(Qt::AlignRight | Qt::AlignBottom);

        QWidget* durationWidget = new QWidget;
        durationWidget->setAttribute(Qt::WA_TranslucentBackground);
        QHBoxLayout* durationLayout = new QHBoxLayout(durationWidget);
        durationLayout->addStretch();
        durationLayout->addWidget(durationLabel);
        durationLayout->setContentsMargins(0,0,8,8);

        thumbStack->addWidget(thumbLabel);
        thumbStack->addWidget(durationWidget);
        cardLayout->addWidget(thumbContainer);

        QLabel* titleLabel = new QLabel(videoTitle);
        titleLabel->setAlignment(Qt::AlignLeft);
        titleLabel->setStyleSheet("font-size: 15px; font-weight: 600; color: #e0e0e0; background: transparent; border: none;");

        QLabel* channelLabel = new QLabel(channel);
        channelLabel->setAlignment(Qt::AlignLeft);
        channelLabel->setStyleSheet("font-size: 12px; color: #8a8a8a; background: transparent; border: none;");

        QWidget* infoWidget = new QWidget;
        QVBoxLayout* infoLayout = new QVBoxLayout(infoWidget);
        infoLayout->setContentsMargins(0,4,0,0);
        infoLayout->setSpacing(2);
        infoLayout->addWidget(titleLabel);
        infoLayout->addWidget(channelLabel);
        infoWidget->setStyleSheet("background: transparent;");
        cardLayout->addWidget(infoWidget);

        QToolButton* btn = new QToolButton;
        btn->setAutoRaise(true);
        btn->setFixedSize(340, 245);
        btn->setStyleSheet("QToolButton { border: none; background: transparent; }");
        btn->setLayout(new QVBoxLayout);
        btn->layout()->setContentsMargins(0,0,0,0);
        btn->layout()->addWidget(cardFrame);

        QObject::connect(btn,&QToolButton::clicked,[filePath](){
            QDesktopServices::openUrl(QUrl::fromLocalFile(filePath));
        });

        QLabel* pinLabel = new QLabel("Pinned", btn);
        pinLabel->setStyleSheet("font-size:18px; color:#ffd700; background: transparent;");
        pinLabel->move(10,10);
        pinLabel->setVisible(false);

        VideoCard* v = new VideoCard{filePath, videoTitle, channel, btn, pinLabel, thumbLabel, false};

        // Load per-video custom thumbnail override
        QSettings settings("Drafty Sumo","Draftys-VideoBrowser");
        QString thumbOverride = settings.value("thumbOverride_" + fileId(filePath)).toString();
        v->customThumbOverride = thumbOverride;

        QString useThumbPath;
        if(!thumbOverride.isEmpty() && QFile::exists(thumbOverride)){
            useThumbPath = thumbOverride;
        }
        v->customThumbPath = useThumbPath;
        v->canceled = false;

        if(!useThumbPath.isEmpty()){
            QPixmap pix;
            pix.load(useThumbPath);
            v->customThumb = pix.scaled(320,180,Qt::KeepAspectRatio,Qt::SmoothTransformation);
            v->thumbLabel->setPixmap(v->customThumb);
        } else {
            QString thumbPath = tempDir.path() + "/" + videoTitle + ".png";
            v->thumbWatcher = new QFutureWatcher<void>(nullptr);
            v->thumbWatcher->setFuture(QtConcurrent::run([filePath, thumbPath, v](){
                if(v->canceled) return;
                extractThumbnail(filePath, thumbPath);
                QPixmap pix(thumbPath);
                if(pix.isNull()) return;
                QPixmap scaled = pix.scaled(320,180,Qt::KeepAspectRatio,Qt::SmoothTransformation);
                v->customThumb = scaled;
                QMetaObject::invokeMethod(v->thumbLabel,"setPixmap",Qt::QueuedConnection,Q_ARG(QPixmap,scaled));
            }));
        }

        auto hoverFuture = QtConcurrent::run([filePath, &tempDir, v, durationLabel](){
            double secs = getVideoDuration(filePath);
            QMetaObject::invokeMethod(durationLabel, "setText", Qt::QueuedConnection, Q_ARG(QString, formatDuration(secs)));
            for(int i=1;i<=5;i++){
                if(v->canceled) return;
                double t = secs * i / 6.0;
                QString hoverPath = tempDir.path() + "/" + v->title + "_hover_" + QString::number(i) + ".png";
                QProcess ffmpeg;
                ffmpeg.start("ffmpeg", {"-y","-ss",QString::number(t),"-i",filePath,"-vframes","1",hoverPath});
                ffmpeg.waitForFinished(1000);
                QPixmap frame;
                frame.load(hoverPath);
                frame = frame.scaled(320,180,Qt::KeepAspectRatio,Qt::SmoothTransformation);
                QMetaObject::invokeMethod(v->thumbLabel, [v, frame](){ v->hoverFrames.append(frame); }, Qt::QueuedConnection);
            }
        });
        Q_UNUSED(hoverFuture);

        btn->installEventFilter(new HoverFilter(v));
        videos.append(v);
    }
    return videos;
}


// ---------------- Populate Grid ----------------
void populateGrid(QGridLayout* grid, QVector<VideoCard*> &videos){
    QLayoutItem* child;
    while((child=grid->takeAt(0))!=nullptr){
        if(child->widget()) child->widget()->setParent(nullptr);
        delete child;
    }

    std::stable_sort(videos.begin(),videos.end(),
                     [](VideoCard* a, VideoCard* b){ return a->pinned && !b->pinned; });

    int row=0, col=0, maxCols=5;
    int hSpacing=18, vSpacing=18;
    grid->setHorizontalSpacing(hSpacing);
    grid->setVerticalSpacing(vSpacing);
    grid->setContentsMargins(18,18,18,18);

    for(auto &v:videos){
        grid->addWidget(v->button,row,col,Qt::AlignTop | Qt::AlignLeft);
        if(v->pinLabel) v->pinLabel->setVisible(v->pinned);
        col++; if(col>=maxCols){ col=0; row++; }
    }

    if(grid->parentWidget()){
        int totalWidth = maxCols*340 + (maxCols-1)*hSpacing
                       + grid->contentsMargins().left() + grid->contentsMargins().right();
        grid->parentWidget()->setFixedWidth(totalWidth);
    }
}

// ------------------- main -------------------
int main(int argc,char *argv[]){
    QApplication app(argc,argv);
    logMessage("App started");

    QSettings settings("Drafty Sumo","Draftys-VideoBrowser");
    QWidget window;
    window.setWindowTitle("Draftys VideoBrowser");
    window.setStyleSheet(R"(
        QWidget {
            background: #181a20;
            color: #e0e0e0;
            font-family: 'Segoe UI', 'Arial', sans-serif;
        }
    )");
    QVBoxLayout* mainLayout = new QVBoxLayout(&window);

    // Top Bar
    QHBoxLayout* topBar = new QHBoxLayout;
    topBar->setSpacing(12);
    topBar->setContentsMargins(12,12,12,12);

    QLineEdit* searchBar = new QLineEdit;
    searchBar->setPlaceholderText("Search videos or channels...");
    searchBar->setStyleSheet(R"(
        QLineEdit {
            padding: 8px 16px;
            border-radius: 8px;
            background: #23272e;
            color: #e0e0e0;
            font-size: 15px;
            border: 1px solid #444;
        }
    )");

    QPushButton* changeVideoDirBtn = new QPushButton("Video Folder");
    changeVideoDirBtn->setIcon(QApplication::style()->standardIcon(QStyle::SP_DirIcon));

    QPushButton* reloadBtn = new QPushButton("Reload");
    reloadBtn->setIcon(QApplication::style()->standardIcon(QStyle::SP_BrowserReload));

    for(auto btn : {changeVideoDirBtn, reloadBtn}) {
        btn->setStyleSheet(R"(
            QPushButton {
                padding: 8px 18px;
                border-radius: 8px;
                background: #0078d7;
                color: white;
                font-weight: 600;
                font-size: 14px;
                border: none;
            }
            QPushButton:hover {
                background: #005fa3;
            }
        )");
    }

    topBar->addWidget(searchBar, 2);
    topBar->addWidget(changeVideoDirBtn, 1);
    topBar->addWidget(reloadBtn, 1);
    mainLayout->addLayout(topBar);

    QScrollArea* scroll = new QScrollArea;
    scroll->setStyleSheet(R"(
        QScrollArea {
            background: #181a20;
            border: none;
        }
    )");
    QWidget* container = new QWidget;
    QGridLayout* grid = new QGridLayout(container);

    QTemporaryDir tempDir;
    QVector<VideoCard*> videos;          // all loaded
    QVector<VideoCard*> filteredVideos;  // filtered by search

    QString videoDir=settings.value("videoDir").toString();
    if(videoDir.isEmpty() || !QDir(videoDir).exists())
        videoDir=QFileDialog::getExistingDirectory(nullptr,"Select Video Directory");

    if(videoDir.isEmpty()) return 0;
    settings.setValue("videoDir",videoDir);

    auto reloadVideos=[&](const QString &videoBase){
        logMessage("Reloading videos from: " + videoBase);

        for(auto v: videos){
            v->canceled = true;
            if(v->hoverTimer) { v->hoverTimer->stop(); delete v->hoverTimer; }
            if(v->thumbWatcher && v->thumbWatcher->isRunning()) v->thumbWatcher->waitForFinished();
            delete v->thumbWatcher;
            delete v;
        }
        videos.clear();

        videos = buildVideoCards(videoBase,tempDir);

        QStringList savedPins=settings.value("pinnedFiles").toStringList();
        for(auto &v:videos) v->pinned = savedPins.contains(fileId(v->filePath));

        for(auto &v:videos){
            v->button->setContextMenuPolicy(Qt::CustomContextMenu);
            const QString id=fileId(v->filePath);
            QObject::connect(v->button,&QToolButton::customContextMenuRequested,[&,id,v](const QPoint &pos){
                QMenu menu;
                QAction* pinAct = menu.addAction(v->pinned ? "Unpin" : "Pin");
                QAction* thumbAct = menu.addAction("Set Thumbnail...");
                QAction* chosen = menu.exec(v->button->mapToGlobal(pos));

                if(chosen == pinAct){
                    v->pinned = !v->pinned;
                    QStringList pins=settings.value("pinnedFiles").toStringList();
                    if(pins.contains(id)) pins.removeAll(id); else pins.append(id);
                    settings.setValue("pinnedFiles",pins);
                    populateGrid(grid,filteredVideos); // refresh filtered view
                }
                else if(chosen == thumbAct){
                    QString path = QFileDialog::getOpenFileName(nullptr,"Select Thumbnail Image",QString(), "Images (*.png *.jpg *.jpeg)");
                    if(!path.isEmpty()){
                        settings.setValue("thumbOverride_" + id, path);
                        QPixmap pix; pix.load(path);
                        v->customThumb = pix.scaled(320,180,Qt::KeepAspectRatio,Qt::SmoothTransformation);
                        v->thumbLabel->setPixmap(v->customThumb);
                    }
                }
            });
        }

        // reset filter when reloading
        filteredVideos = videos;
        populateGrid(grid, filteredVideos);
    };

    reloadVideos(videoDir);
    QObject::connect(reloadBtn,&QPushButton::clicked,[&](){ reloadVideos(videoDir); });
    QObject::connect(changeVideoDirBtn,&QPushButton::clicked,[&](){
        QString dir=QFileDialog::getExistingDirectory(nullptr,"Select Video Directory");
        if(!dir.isEmpty()){
            settings.setValue("videoDir",dir);
            reloadVideos(dir);
        }
    });

    // --- Search connection ---
    QObject::connect(searchBar, &QLineEdit::textChanged, [&](const QString &query){
        QString search = query.trimmed().toLower();
        filteredVideos.clear();
        if(search.isEmpty()){
            filteredVideos = videos; // show all
        } else {
            for(auto v : videos){
                if(v->title.toLower().contains(search) ||
                   v->channel.toLower().contains(search)){
                    filteredVideos.append(v);
                }
            }
        }
        populateGrid(grid, filteredVideos);
    });

    scroll->setWidget(container);
    scroll->setWidgetResizable(true);
    mainLayout->addWidget(scroll);
    window.showMaximized();
    return app.exec();
}

#include "main.moc"
