# Generated for SIS ENSET v5
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('memoires', '0001_initial'),
    ]

    operations = [
        migrations.AddField(model_name='memoire', name='auteur_email', field=models.EmailField(blank=True, max_length=254)),
        migrations.AddField(model_name='memoire', name='auteur_telephone', field=models.CharField(blank=True, max_length=30)),
        migrations.AddField(model_name='memoire', name='photo_auteur', field=models.ImageField(blank=True, null=True, upload_to='memoires/auteurs/')),
        migrations.AddField(model_name='memoire', name='option', field=models.CharField(blank=True, max_length=120)),
        migrations.AddField(model_name='memoire', name='introduction', field=models.TextField(blank=True)),
        migrations.AddField(model_name='memoire', name='problematique', field=models.TextField(blank=True)),
        migrations.AddField(model_name='memoire', name='materiels_methodes', field=models.TextField(blank=True, help_text='Tableau ou contenu structure des outils, materiels et methodes.')),
        migrations.AddField(model_name='memoire', name='resultats_discussion', field=models.TextField(blank=True)),
        migrations.AddField(model_name='memoire', name='support_presentation', field=models.FileField(blank=True, null=True, upload_to='memoires/presentations/')),
        migrations.AddField(model_name='memoire', name='resume_pdf', field=models.FileField(blank=True, null=True, upload_to='memoires/resumes/pdf/')),
        migrations.AddField(model_name='memoire', name='resume_html', field=models.FileField(blank=True, null=True, upload_to='memoires/resumes/html/')),
        migrations.AddField(model_name='memoire', name='video_demo', field=models.FileField(blank=True, null=True, upload_to='memoires/videos/demo/')),
        migrations.AddField(model_name='memoire', name='video_presentation', field=models.FileField(blank=True, null=True, upload_to='memoires/videos/presentation/')),
        migrations.AddField(model_name='memoire', name='nb_consultations', field=models.IntegerField(default=0)),
        migrations.AddField(model_name='memoire', name='updated_at', field=models.DateTimeField(auto_now=True)),
        migrations.AlterField(model_name='memoire', name='fichier_pdf', field=models.FileField(upload_to='memoires/pdf/')),
    ]
